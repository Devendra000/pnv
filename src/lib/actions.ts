'use server';

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { prisma } from './prisma';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import {
  Company,
  CompanyObjectiveTemplate,
  ObjectiveCategory,
  Variable as UIVariable,
  Template,
  Document,
  CompanyFolder,
  Stats,
  CompanyVariableValue as UICompanyVariableValue,
} from './types';
import {
  buildCompanyRuntimeVariableValues,
  buildCompanyTemplateData,
  COMPANY_VARIABLE_DEFINITIONS,
} from '@/lib/companyVariables';
import { extractDocxTemplateData, cleanDocxZipTags } from '@/lib/templateParser';

type CompanyVariableValueRow = {
  id: string;
  companyId: string;
  variableId: string;
  value: string;
  variable: {
    key: string;
    label: string;
  };
};

function mapCompanyVariableValues(values: unknown): UICompanyVariableValue[] {
  return (values as CompanyVariableValueRow[]).map((entry) => ({
    id: entry.id,
    companyId: entry.companyId,
    variableId: entry.variableId,
    variableKey: entry.variable.key,
    variableLabel: entry.variable.label,
    value: entry.value,
  }));
}

import { resolvePublicFilePath } from './filePath';

function getCompanyDocumentsPath(companyId: string) {
  return `/uploads/companies/${companyId}`;
}

async function ensureCompanyRootFolder(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) throw new Error('Company not found.');

  const path = getCompanyDocumentsPath(companyId);
  let root = await prisma.companyFolder.findFirst({
    where: { companyId, parentFolderId: null, path },
  });

  if (!root) {
    root = await prisma.companyFolder.create({
      data: { companyId, parentFolderId: null, name: 'Documents', path },
    });
  }

  await fs.mkdir(resolvePublicFilePath(root.path), { recursive: true });

  // Ensure default "Generated" subfolder exists under company root
  let generatedFolder = await prisma.companyFolder.findFirst({
    where: { companyId, parentFolderId: root.id, name: 'Generated' },
  });
  if (!generatedFolder) {
    generatedFolder = await prisma.companyFolder.create({
      data: {
        companyId,
        parentFolderId: root.id,
        name: 'Generated',
        path: `${root.path}/.pending-${crypto.randomUUID()}`,
      },
    });
    const genPath = `${root.path}/${generatedFolder.id}`;
    generatedFolder = await prisma.companyFolder.update({
      where: { id: generatedFolder.id },
      data: { path: genPath },
    });
    try {
      await prisma.$executeRaw`UPDATE company_folders SET is_default = true WHERE id = ${generatedFolder.id}`;
    } catch (e) {
      console.error('Failed to set default flag via raw SQL:', e);
    }
    await fs.mkdir(resolvePublicFilePath(genPath), { recursive: true });
  } else {
    try {
      const rows: any[] = await prisma.$queryRaw`SELECT id FROM company_folders WHERE company_id = ${companyId} AND is_default = true LIMIT 1`;
      if (!rows.length) {
        await prisma.$executeRaw`UPDATE company_folders SET is_default = true WHERE id = ${generatedFolder.id}`;
      }
    } catch (e) {
      console.error('Failed to verify default folder via raw SQL:', e);
    }
  }

  return root;
}

function mapFolder(folder: {
  id: string;
  companyId: string;
  parentFolderId: string | null;
  name: string;
  path: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CompanyFolder {
  return {
    id: folder.id,
    companyId: folder.companyId,
    parentFolderId: folder.parentFolderId,
    name: folder.name,
    path: folder.path,
    isDefault: Boolean(folder.isDefault),
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

function humanizeVariableKey(key: string) {
  return key
    .replace(/_(\d+)$/, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferVariableType(key: string): 'text' | 'number' | 'date' | 'list' {
  if (key.includes('date')) {
    return 'date';
  }

  if (key.includes('count') || key.includes('share_percentage')) {
    return 'number';
  }

  if (key.includes('names') || key.includes('texts') || key.includes('list')) {
    return 'list';
  }

  return 'text';
}

async function ensureVariableForKey(key: string) {
  return prisma.variable.upsert({
    where: { key },
    update: {
      label: humanizeVariableKey(key),
      type: inferVariableType(key),
    },
    create: {
      key,
      label: humanizeVariableKey(key),
      type: inferVariableType(key),
    },
  });
}

async function syncCompanyVariableValues(
  companyId: string,
  data: {
    englishName: string;
    nepaliName?: string | null;
    ownerType: 'SINGLE' | 'MULTIPLE';
    owners: Array<{
      name: string;
      fatherName?: string | null;
      address?: string | null;
      citizenship?: string | null;
      jariJilla?: string | null;
      citizenshipJariDate?: string | null;
      phoneNumber?: string | null;
      shares?: string | null;
      order?: number;
    }>;
    witnesses: Array<{
      name: string;
      address?: string | null;
      citizenship?: string | null;
      jariJilla?: string | null;
      citizenshipJariDate?: string | null;
      phoneNumber?: string | null;
      order?: number;
    }>;
    objectives: Array<{ text: string; order?: number }>;
    variableValues: Array<{ variableId: string; value: string }>;
  }
) {
  // Only the registered scalar/aggregate keys are persisted.
  // Per-slot indexed keys (owner_name_1, witness_name_2, etc.) are
  // computed at render time and must NOT be stored as DB variables.
  const DEFINED_KEYS = new Set(COMPANY_VARIABLE_DEFINITIONS.map((d) => d.key));

  const allDerived = buildCompanyRuntimeVariableValues(data);

  // Only keep the keys that are in COMPANY_VARIABLE_DEFINITIONS
  const derivedValues: Record<string, string> = {};
  for (const key of DEFINED_KEYS) {
    if (allDerived[key] !== undefined) {
      derivedValues[key] = allDerived[key];
    }
  }

  // Also apply any manual overrides from the user (variables page entries),
  // but only for non-system keys that the user explicitly set.
  const variableIds = data.variableValues.map((entry) => entry.variableId);
  const dbVariables = variableIds.length
    ? await prisma.variable.findMany({ where: { id: { in: variableIds } } })
    : [];
  const variableKeyById = new Map(dbVariables.map((v) => [v.id, v.key]));

  for (const entry of data.variableValues) {
    const key = variableKeyById.get(entry.variableId);
    // Only persist user manual variables — skip system/defined keys and empties
    if (!key || entry.value.trim() === '' || DEFINED_KEYS.has(key as never)) {
      continue;
    }
    derivedValues[key] = entry.value;
  }

  const keys = Object.keys(derivedValues);
  const savedVariables = await Promise.all(keys.map((key) => ensureVariableForKey(key)));
  const variableIdByKey = new Map(savedVariables.map((v) => [v.key, v.id]));

  await prisma.companyVariableValue.deleteMany({ where: { companyId } });

  await prisma.companyVariableValue.createMany({
    data: keys
      .filter((key) => derivedValues[key].trim() !== '')
      .map((key) => ({
        companyId,
        variableId: variableIdByKey.get(key)!,
        value: derivedValues[key],
      })),
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceDocxVariables(zip: PizZip, variables: Record<string, string>) {
  const xmlParts = [
    'word/document.xml',
    'word/header1.xml',
    'word/header2.xml',
    'word/header3.xml',
    'word/footer1.xml',
    'word/footer2.xml',
    'word/footer3.xml',
    'word/comments.xml',
    'word/footnotes.xml',
    'word/endnotes.xml',
  ];

  const replacementMap = createReplacementMap(variables);
  const replacements: Array<{ pattern: RegExp; value: string }> = [];

  for (const [key, rawValue] of Object.entries(replacementMap)) {
    const val = escapeXml(rawValue ?? '');
    const variants = new Set([
      escapeRegExp(key),
      escapeRegExp(key.replace(/_/g, ' ')),
      escapeRegExp(key.replace(/\s+/g, '_')),
    ]);

    for (const variant of variants) {
      replacements.push({
        pattern: new RegExp(`\\[\\s*${variant}\\s*\\]`, 'gi'),
        value: val,
      });
    }
  }

  for (const fileName of xmlParts) {
    const file = zip.file(fileName);
    if (!file) continue;

    let xml = file.asText();
    for (const replacement of replacements) {
      xml = xml.replace(replacement.pattern, replacement.value);
    }
    zip.file(fileName, xml);
  }

  return Buffer.from(
    zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
  );
}

type CompanyVariableValueInput = {
  variableId: string;
  value: string;
};

// Helper to read content from disk
async function readFileContent(relativeUrl: string): Promise<string> {
  if (!relativeUrl) return '';
  try {
    const filePath = resolvePublicFilePath(relativeUrl);
    if (relativeUrl.toLowerCase().endsWith('.docx')) {
      const fileBuffer = await fs.readFile(filePath);
      return extractDocxTemplateData(fileBuffer, []).content;
    }

    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file at ${relativeUrl}:`, error);
    return 'File content not found on disk.';
  }
}

async function readTemplateFile(relativeUrl: string): Promise<Buffer> {
  if (!relativeUrl) return Buffer.from('');
  try {
    const filePath = resolvePublicFilePath(relativeUrl);
    return await fs.readFile(filePath);
  } catch (error) {
    console.error(`Error reading file at ${relativeUrl}:`, error);
    return Buffer.from('');
  }
}

function createReplacementMap(variables: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [key, value ?? ''])
  );
}

async function renderDocxTemplate(templateId: string, variables: Record<string, string>, templateData?: Record<string, unknown>) {
  const templatePath = path.join(process.cwd(), 'public', 'uploads', 'templates', `${templateId}.docx`);
  const templateBuffer = await fs.readFile(templatePath);
  const zip = cleanDocxZipTags(new PizZip(templateBuffer));

  const mergedData: Record<string, unknown> = {
    ...(templateData || {}),
  };

  if (mergedData.owners_list && !mergedData.owner_list) {
    mergedData.owner_list = mergedData.owners_list;
  }

  const LOOP_KEYS = new Set(['owners_list', 'owner_list', 'witnesses_list', 'owner_witnesses']);

  for (const [key, value] of Object.entries(variables)) {
    if (LOOP_KEYS.has(key)) {
      continue;
    }
    if (value !== undefined && value !== null) {
      const valStr = String(value);
      mergedData[key] = valStr;
      mergedData[key.replace(/\s+/g, '_')] = valStr;
      mergedData[key.replace(/_/g, ' ')] = valStr;
    }
  }

  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return '';
      },
      delimiters: {
        start: '[',
        end: ']',
      },
    });

    doc.render(mergedData);

    return Buffer.from(
      doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })
    );
  } catch (error) {
    console.error('Docxtemplater render failed, falling back to raw XML replacement:', error);
    return replaceDocxVariables(new PizZip(templateBuffer), variables);
  }
}

/**
 * Server action to render a template into a DOCX buffer with variables & loop data,
 * returning a base64 encoded string for live in-browser preview via docx-preview.
 */
export async function renderDocxPreviewAction(
  templateId: string,
  variables: Record<string, string>,
  templateData?: Record<string, unknown>
): Promise<string> {
  try {
    const buffer = await renderDocxTemplate(templateId, variables, templateData);
    return buffer.toString('base64');
  } catch (err) {
    console.error('Failed to render DOCX preview:', err);
    return '';
  }
}

export async function saveCompanyVariableValuesAction(
  companyId: string,
  values: CompanyVariableValueInput[]
): Promise<UICompanyVariableValue[]> {
  const normalizedValues = values.filter((entry) => entry.value.trim() !== '');

  await prisma.$transaction(
    normalizedValues.map((entry) =>
      prisma.companyVariableValue.upsert({
        where: {
          companyId_variableId: {
            companyId,
            variableId: entry.variableId,
          },
        },
        update: {
          value: entry.value,
        },
        create: {
          companyId,
          variableId: entry.variableId,
          value: entry.value,
        },
      })
    )
  );

  const updatedValues = await prisma.companyVariableValue.findMany({
    where: { companyId },
    include: { variable: true },
    orderBy: { variable: { key: 'asc' } },
  });

  return mapCompanyVariableValues(updatedValues);
}

/**
 * Creates a manual Variable record (if it doesn't exist) and saves a company value for it.
 * Used when a template has a key that isn't in the manual variables DB yet, and the user
 * wants to promote it to a proper manual variable.
 */
export async function addTemplateVariableToManualAction(
  key: string,
  label: string,
  companyId: string,
  value: string
): Promise<{ variableId: string }> {
  const variable = await prisma.variable.upsert({
    where: { key },
    update: { label },
    create: {
      key,
      label: label || humanizeVariableKey(key),
      type: inferVariableType(key),
    },
  });

  if (value.trim()) {
    await prisma.companyVariableValue.upsert({
      where: { companyId_variableId: { companyId, variableId: variable.id } },
      update: { value },
      create: { companyId, variableId: variable.id, value },
    });
  }

  return { variableId: variable.id };
}

async function extractTemplateData(relativeUrl: string, variables: UIVariable[]) {
  const fileBuffer = await readTemplateFile(relativeUrl);

  if (!fileBuffer.length) {
    return {
      content: '',
      detectedKeys: [] as string[],
      matchedVariables: [] as UIVariable[],
    };
  }

  if (relativeUrl.endsWith('.docx')) {
    return extractDocxTemplateData(fileBuffer, variables);
  }

  return {
    content: fileBuffer.toString('utf8'),
    detectedKeys: [] as string[],
    matchedVariables: [] as UIVariable[],
  };
}

// Fetch all app data
export async function fetchAppData(): Promise<{
  companies: Company[];
  objectiveCategories: ObjectiveCategory[];
  objectives: CompanyObjectiveTemplate[];
  variables: UIVariable[];
  templates: Template[];
  documents: Document[];
  stats: Stats;
}> {
  try {
    // 1. Fetch Companies
    const dbCompanies = await prisma.company.findMany({
      include: {
        owners: { orderBy: { order: 'asc' } },
        witnesses: { orderBy: { order: 'asc' } },
        objectives: { orderBy: { order: 'asc' } },
        variableValues: {
          include: { variable: true },
          orderBy: { variable: { key: 'asc' } },
        },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const companies: Company[] = dbCompanies.map((c) => ({
      id: c.id,
      englishName: c.englishName,
      nepaliName: c.nepaliName,
      ownerType: c.ownerType,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      owners: c.owners.map((o) => ({
        id: o.id,
        name: o.name,
        fatherName: o.fatherName,
        address: o.address,
        citizenship: o.citizenship,
        jariJilla: o.jariJilla,
        citizenshipJariDate: o.citizenshipJariDate,
        phoneNumber: o.phoneNumber,
        shares: o.shares,
        order: o.order,
      })),
      witnesses: c.witnesses.map((w) => ({
        id: w.id,
        name: w.name,
        address: w.address,
        citizenship: w.citizenship,
        jariJilla: w.jariJilla,
        citizenshipJariDate: w.citizenshipJariDate,
        phoneNumber: w.phoneNumber,
        ownerIndex: w.ownerIndex,
        order: w.order,
      })),
      objectives: c.objectives.map((o) => ({
        id: o.id,
        companyId: o.companyId,
        sourceObjectiveId: o.sourceObjectiveId,
        text: o.text,
        order: o.order,
      })),
      variableValues: mapCompanyVariableValues(c.variableValues),
      documentCount: c.documents.length,
    }));

    // 2. Fetch Objective Categories (seed defaults if empty)
    let dbCategories = await prisma.objectiveCategory.findMany({
      orderBy: { order: 'asc' },
    });

    if (dbCategories.length === 0) {
      const defaultCategories = [
        { name: 'Information Technology & Software', description: 'Software development, IT consulting, cloud services, data processing', order: 1 },
        { name: 'Hotel, Tourism & Hospitality', description: 'Hotels, resorts, travel agencies, trekking, tour operators', order: 2 },
        { name: 'Banks, Finance & Insurance', description: 'Banking, financial institutions, microfinance, insurance, cooperative services', order: 3 },
        { name: 'Agriculture, Forestry & Livestock', description: 'Farming, agro-processing, livestock, organic farming, forestry', order: 4 },
        { name: 'Manufacturing, Processing & Production', description: 'Industrial manufacturing, goods processing, packaging, assembly', order: 5 },
        { name: 'Trading, Commerce & Retail', description: 'Import, export, wholesale, retail trade, distribution', order: 6 },
        { name: 'Energy, Hydropower & Natural Resources', description: 'Hydropower plants, solar energy, renewable energy, natural resources', order: 7 },
        { name: 'Healthcare, Medical & Pharmaceuticals', description: 'Hospitals, clinics, medical equipment, pharmaceutical trade', order: 8 },
        { name: 'Education, Training & Research', description: 'Schools, colleges, vocational institutes, research centers', order: 9 },
        { name: 'General & Services', description: 'General business objectives and multi-sector operations', order: 10 },
      ];

      await prisma.objectiveCategory.createMany({
        data: defaultCategories,
      });

      dbCategories = await prisma.objectiveCategory.findMany({
        orderBy: { order: 'asc' },
      });
    }

    const objectiveCategories: ObjectiveCategory[] = dbCategories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      order: c.order,
      createdAt: c.createdAt.toISOString(),
    }));

    // 3. Fetch Global Objectives
    const dbObjectives = await prisma.objective.findMany({
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    });

    const objectives: CompanyObjectiveTemplate[] = dbObjectives.map((o) => ({
      id: o.id,
      categoryId: o.categoryId,
      categoryName: o.category?.name || null,
      text: o.text,
      createdAt: o.createdAt.toISOString(),
    }));

    // 3. Fetch Variables
    const dbVariables = await prisma.variable.findMany({
      orderBy: { key: 'asc' },
    });

    const variables: UIVariable[] = dbVariables.map((v) => ({
      id: v.id,
      key: v.key,
      label: v.label,
      type: v.type as UIVariable['type'],
    }));

    // 4. Fetch Templates & read files
    const dbTemplates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const templates: Template[] = await Promise.all(
      dbTemplates.map(async (t) => {
        const parsed = await extractTemplateData(t.fileUrl, variables);
        return {
          id: t.id,
          name: t.name,
          fileUrl: t.fileUrl,
          createdAt: t.createdAt.toISOString(),
          content: parsed.content,
          detectedKeys: parsed.detectedKeys,
          matchedVariables: parsed.matchedVariables,
        };
      })
    );

    // 5. Fetch Generated Documents & read files
    const dbDocuments = await prisma.generatedDocument.findMany({
      include: {
        company: true,
        template: true,
      },
      orderBy: { generatedAt: 'desc' },
    });

    const documents: Document[] = await Promise.all(
      dbDocuments.map(async (d) => {
        const content = await readFileContent(d.docxUrl);
        return {
          id: d.id,
          fileName: d.fileName || (d.variables as any)?.customFileName || null,
          templateId: d.templateId,
          templateName: d.template?.name || 'Unknown Template',
          companyId: d.companyId,
          companyName: d.company?.englishName || 'Unknown Company',
          folderId: d.folderId,
          docxUrl: d.docxUrl,
          pdfUrl: d.pdfUrl,
          variables: (d.variables as Record<string, string>) || undefined,
          generatedAt: d.generatedAt.toISOString(),
          content,
        };
      })
    );

    // 6. Calculate Stats
    const stats: Stats = {
      totalCompanies: companies.length,
      totalObjectives: objectives.length,
      totalVariables: variables.length,
      totalTemplates: templates.length,
      totalDocumentsGenerated: documents.length,
    };

    return {
      companies,
      objectiveCategories,
      objectives,
      variables,
      templates,
      documents,
      stats,
    };
  } catch (error) {
    console.error('Error fetching app data:', error);
    return {
      companies: [],
      objectiveCategories: [],
      objectives: [],
      variables: [],
      templates: [],
      documents: [],
      stats: {
        totalCompanies: 0,
        totalObjectives: 0,
        totalVariables: 0,
        totalTemplates: 0,
        totalDocumentsGenerated: 0,
      },
    };
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function required(value: string | null | undefined, label: string) {
  if (!value || value.trim() === '') {
    throw new Error(`${label} is required.`);
  }
}

function validateCompanyData(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>) {
  // Company-level
  required(data.englishName, 'Company English Name');
  required(data.nepaliName, 'Company Nepali Name');

  // Owners
  data.owners.forEach((o, idx) => {
    const label = (field: string) => `Owner ${idx + 1}: ${field}`;
    required(o.name, label('Name'));
    required((o as { fatherName?: string | null }).fatherName, label("Father's Name"));
    required(o.address, label('Address'));
    required(o.citizenship, label('Citizenship No.'));
    required(o.jariJilla, label('Jari Jilla'));
    required(o.citizenshipJariDate, label('Citizenship Issued Date'));
    if (o.citizenshipJariDate && !/^\d{4}-\d{2}-\d{2}$/.test(o.citizenshipJariDate)) {
      throw new Error(`Owner ${idx + 1}: Citizenship Issued Date must be in YYYY-MM-DD format.`);
    }
  });

  // Witnesses
  data.witnesses.forEach((w, idx) => {
    const label = (field: string) => `Witness ${idx + 1}: ${field}`;
    required(w.name, label('Name'));
    required(w.citizenship, label('Citizenship No.'));
    required(w.jariJilla, label('Jari Jilla'));
    required(w.citizenshipJariDate, label('Citizenship Issued Date'));
    if (w.citizenshipJariDate && !/^\d{4}-\d{2}-\d{2}$/.test(w.citizenshipJariDate)) {
      throw new Error(`Witness ${idx + 1}: Citizenship Issued Date must be in YYYY-MM-DD format.`);
    }
  });
}

// Company mutations
export async function createCompanyAction(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>): Promise<Company> {
  validateCompanyData(data);

  const c = await prisma.company.create({
    data: {
      englishName: data.englishName,
      nepaliName: data.nepaliName || '',
      ownerType: data.ownerType,
      owners: {
        create: data.owners.map((o, idx) => ({
          name: o.name,
          fatherName: o.fatherName || null,
          address: o.address || null,
          citizenship: o.citizenship || null,
          jariJilla: o.jariJilla || null,
          citizenshipJariDate: o.citizenshipJariDate || null,
          phoneNumber: o.phoneNumber || null,
          shares: o.shares || null,
          order: idx,
        })),
      },
      witnesses: {
        create: data.witnesses.map((w, idx) => ({
          name: w.name,
          address: w.address || null,
          citizenship: w.citizenship || null,
          jariJilla: w.jariJilla || null,
          citizenshipJariDate: w.citizenshipJariDate || null,
          phoneNumber: w.phoneNumber || null,
          ownerIndex: (w as { ownerIndex?: number | null }).ownerIndex ?? null,
          order: idx,
        })),
      },
      objectives: {
        create: data.objectives.map((o, idx) => ({
          sourceObjectiveId: o.sourceObjectiveId || null,
          text: o.text,
          order: idx,
        })),
      },
    },
    include: {
      owners: { orderBy: { order: 'asc' } },
      witnesses: { orderBy: { order: 'asc' } },
      objectives: { orderBy: { order: 'asc' } },
      variableValues: { include: { variable: true }, orderBy: { variable: { key: 'asc' } } },
      documents: true,
    },
  });

  await ensureCompanyRootFolder(c.id);

  await syncCompanyVariableValues(c.id, {
    ...data,
    variableValues: data.variableValues,
  });

  const reloaded = await prisma.company.findUnique({
    where: { id: c.id },
    include: {
      owners: { orderBy: { order: 'asc' } },
      witnesses: { orderBy: { order: 'asc' } },
      objectives: { orderBy: { order: 'asc' } },
      variableValues: { include: { variable: true }, orderBy: { variable: { key: 'asc' } } },
      documents: true,
    },
  });

  if (!reloaded) {
    throw new Error('Failed to reload created company');
  }

  return {
    id: reloaded.id,
    englishName: reloaded.englishName,
    nepaliName: reloaded.nepaliName,
    ownerType: reloaded.ownerType,
    createdAt: reloaded.createdAt.toISOString(),
    updatedAt: reloaded.updatedAt.toISOString(),
    owners: reloaded.owners.map((o) => ({
      id: o.id,
      name: o.name,
      fatherName: o.fatherName,
      address: o.address,
      citizenship: o.citizenship,
      jariJilla: o.jariJilla,
      citizenshipJariDate: o.citizenshipJariDate,
      phoneNumber: o.phoneNumber,
      shares: o.shares,
      order: o.order,
    })),
    witnesses: reloaded.witnesses.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address,
      citizenship: w.citizenship,
      jariJilla: w.jariJilla,
      citizenshipJariDate: w.citizenshipJariDate,
      phoneNumber: w.phoneNumber,
      ownerIndex: w.ownerIndex,
      order: w.order,
    })),
    objectives: reloaded.objectives.map((o) => ({ id: o.id, companyId: o.companyId, sourceObjectiveId: o.sourceObjectiveId, text: o.text, order: o.order })),
    variableValues: mapCompanyVariableValues(reloaded.variableValues),
    documentCount: reloaded.documents.length,
  };
}

export async function updateCompanyAction(
  id: string,
  data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>
): Promise<Company> {
  validateCompanyData(data);

  await prisma.$transaction([
    prisma.companyOwner.deleteMany({ where: { companyId: id } }),
    prisma.companyWitness.deleteMany({ where: { companyId: id } }),
    prisma.companyObjective.deleteMany({ where: { companyId: id } }),
    prisma.companyVariableValue.deleteMany({ where: { companyId: id } }),
  ]);

  const c = await prisma.company.update({
    where: { id },
    data: {
      englishName: data.englishName,
      nepaliName: data.nepaliName || '',
      ownerType: data.ownerType,
      owners: {
        create: data.owners.map((o, idx) => ({
          name: o.name,
          fatherName: o.fatherName || null,
          address: o.address || null,
          citizenship: o.citizenship || null,
          jariJilla: o.jariJilla || null,
          citizenshipJariDate: o.citizenshipJariDate || null,
          phoneNumber: o.phoneNumber || null,
          shares: o.shares || null,
          order: idx,
        })),
      },
      witnesses: {
        create: data.witnesses.map((w, idx) => ({
          name: w.name,
          address: w.address || null,
          citizenship: w.citizenship || null,
          jariJilla: w.jariJilla || null,
          citizenshipJariDate: w.citizenshipJariDate || null,
          phoneNumber: w.phoneNumber || null,
          ownerIndex: (w as { ownerIndex?: number | null }).ownerIndex ?? null,
          order: idx,
        })),
      },
      objectives: {
        create: data.objectives.map((o, idx) => ({
          sourceObjectiveId: o.sourceObjectiveId || null,
          text: o.text,
          order: idx,
        })),
      },
    },
    include: {
      owners: { orderBy: { order: 'asc' } },
      witnesses: { orderBy: { order: 'asc' } },
      objectives: { orderBy: { order: 'asc' } },
      variableValues: { include: { variable: true }, orderBy: { variable: { key: 'asc' } } },
      documents: true,
    },
  });

  await ensureCompanyRootFolder(c.id);

  await syncCompanyVariableValues(c.id, {
    ...data,
    variableValues: data.variableValues,
  });

  const reloaded = await prisma.company.findUnique({
    where: { id },
    include: {
      owners: { orderBy: { order: 'asc' } },
      witnesses: { orderBy: { order: 'asc' } },
      objectives: { orderBy: { order: 'asc' } },
      variableValues: { include: { variable: true }, orderBy: { variable: { key: 'asc' } } },
      documents: true,
    },
  });

  if (!reloaded) {
    throw new Error('Failed to reload updated company');
  }

  return {
    id: reloaded.id,
    englishName: reloaded.englishName,
    nepaliName: reloaded.nepaliName,
    ownerType: reloaded.ownerType,
    createdAt: reloaded.createdAt.toISOString(),
    updatedAt: reloaded.updatedAt.toISOString(),
    owners: reloaded.owners.map((o) => ({
      id: o.id,
      name: o.name,
      fatherName: o.fatherName,
      address: o.address,
      citizenship: o.citizenship,
      jariJilla: o.jariJilla,
      citizenshipJariDate: o.citizenshipJariDate,
      phoneNumber: o.phoneNumber,
      shares: o.shares,
      order: o.order,
    })),
    witnesses: reloaded.witnesses.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address,
      citizenship: w.citizenship,
      jariJilla: w.jariJilla,
      citizenshipJariDate: w.citizenshipJariDate,
      phoneNumber: w.phoneNumber,
      ownerIndex: w.ownerIndex,
      order: w.order,
    })),
    objectives: reloaded.objectives.map((o) => ({ id: o.id, companyId: o.companyId, sourceObjectiveId: o.sourceObjectiveId, text: o.text, order: o.order })),
    variableValues: mapCompanyVariableValues(reloaded.variableValues),
    documentCount: reloaded.documents.length,
  };
}

export async function deleteCompanyAction(id: string): Promise<void> {
  const docs = await prisma.generatedDocument.findMany({ where: { companyId: id } });
  for (const doc of docs) {
    try {
      const filePath = resolvePublicFilePath(doc.docxUrl);
      await fs.unlink(filePath);
    } catch (e) {
      console.error('Failed to delete file:', e);
    }
  }
  try {
    await fs.rm(resolvePublicFilePath(getCompanyDocumentsPath(id)), { recursive: true, force: true });
  } catch (e) {
    console.error('Failed to delete company document folder:', e);
  }
  await prisma.generatedDocument.deleteMany({ where: { companyId: id } });
  await prisma.company.delete({ where: { id } });
}

// Objective Category mutations
export async function createObjectiveCategoryAction(data: { name: string; description?: string; order?: number }): Promise<ObjectiveCategory> {
  const cat = await prisma.objectiveCategory.create({
    data: {
      name: data.name,
      description: data.description || null,
      order: data.order ?? 0,
    },
  });
  return {
    id: cat.id,
    name: cat.name,
    description: cat.description,
    order: cat.order,
    createdAt: cat.createdAt.toISOString(),
  };
}

export async function updateObjectiveCategoryAction(id: string, data: { name: string; description?: string; order?: number }): Promise<ObjectiveCategory> {
  const cat = await prisma.objectiveCategory.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      order: data.order ?? 0,
    },
  });
  return {
    id: cat.id,
    name: cat.name,
    description: cat.description,
    order: cat.order,
    createdAt: cat.createdAt.toISOString(),
  };
}

export async function deleteObjectiveCategoryAction(id: string): Promise<void> {
  await prisma.objectiveCategory.delete({ where: { id } });
}

// Objective mutations
export async function createObjectiveAction(text: string, categoryId?: string | null): Promise<CompanyObjectiveTemplate> {
  const o = await prisma.objective.create({
    data: {
      text,
      categoryId: categoryId || null,
    },
    include: { category: true },
  });
  return {
    id: o.id,
    categoryId: o.categoryId,
    categoryName: o.category?.name || null,
    text: o.text,
    createdAt: o.createdAt.toISOString(),
  };
}

export async function updateObjectiveAction(id: string, text: string, categoryId?: string | null): Promise<CompanyObjectiveTemplate> {
  const o = await prisma.objective.update({
    where: { id },
    data: {
      text,
      categoryId: categoryId || null,
    },
    include: { category: true },
  });
  return {
    id: o.id,
    categoryId: o.categoryId,
    categoryName: o.category?.name || null,
    text: o.text,
    createdAt: o.createdAt.toISOString(),
  };
}

export async function deleteObjectiveAction(id: string): Promise<void> {
  await prisma.objective.delete({ where: { id } });
}

// Variable mutations
export async function createVariableAction(data: Omit<UIVariable, 'id'>): Promise<UIVariable> {
  const v = await prisma.variable.create({
    data: {
      key: data.key,
      label: data.label,
      type: data.type,
    },
  });
  return {
    id: v.id,
    key: v.key,
    label: v.label,
    type: v.type as UIVariable['type'],
  };
}

export async function updateVariableAction(id: string, data: Omit<UIVariable, 'id'>): Promise<UIVariable> {
  const v = await prisma.variable.update({
    where: { id },
    data: {
      key: data.key,
      label: data.label,
      type: data.type,
    },
  });
  return {
    id: v.id,
    key: v.key,
    label: v.label,
    type: v.type as UIVariable['type'],
  };
}

export async function deleteVariableAction(id: string): Promise<void> {
  await prisma.variable.delete({ where: { id } });
}

// Template mutations
async function writeTemplateFile(templateId: string, fileData: string) {
  const buffer = Buffer.from(fileData, 'base64');
  const fileUrl = `/uploads/templates/${templateId}.docx`;
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'templates', `${templateId}.docx`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return fileUrl;
}

export async function createTemplateAction(data: { name: string; fileName: string; fileData: string }): Promise<Template> {
  const t = await prisma.template.create({
    data: {
      name: data.name,
      fileUrl: '',
    },
  });

  const fileUrl = await writeTemplateFile(t.id, data.fileData);
  await prisma.template.update({
    where: { id: t.id },
    data: { fileUrl },
  });

  const variables = await prisma.variable.findMany({ orderBy: { key: 'asc' } });
  const parsed = await extractTemplateData(fileUrl, variables.map((v) => ({
    id: v.id,
    key: v.key,
    label: v.label,
    type: v.type as UIVariable['type'],
  })));

  return {
    id: t.id,
    name: t.name,
    fileUrl,
    createdAt: t.createdAt.toISOString(),
    content: parsed.content,
    detectedKeys: parsed.detectedKeys,
    matchedVariables: parsed.matchedVariables,
  };
}

export async function updateTemplateAction(id: string, data: { name: string; fileName?: string; fileData?: string }): Promise<Template> {
  const t = await prisma.template.update({
    where: { id },
    data: {
      name: data.name,
    },
  });

  let fileUrl = t.fileUrl;
  if (data.fileData) {
    fileUrl = await writeTemplateFile(id, data.fileData);
    await prisma.template.update({
      where: { id },
      data: { fileUrl },
    });
  }

  const variables = await prisma.variable.findMany({ orderBy: { key: 'asc' } });
  const parsed = await extractTemplateData(fileUrl, variables.map((v) => ({
    id: v.id,
    key: v.key,
    label: v.label,
    type: v.type as UIVariable['type'],
  })));

  return {
    id: t.id,
    name: t.name,
    fileUrl,
    createdAt: t.createdAt.toISOString(),
    content: parsed.content,
    detectedKeys: parsed.detectedKeys,
    matchedVariables: parsed.matchedVariables,
  };
}

export async function deleteTemplateAction(id: string): Promise<void> {
  const t = await prisma.template.findUnique({ where: { id } });
  if (t) {
    try {
      const filePath = resolvePublicFilePath(t.fileUrl);
      await fs.unlink(filePath);
    } catch (e) {
      console.error('Failed to delete file:', e);
    }
  }

  const docs = await prisma.generatedDocument.findMany({ where: { templateId: id } });
  for (const doc of docs) {
    try {
      const filePath = resolvePublicFilePath(doc.docxUrl);
      await fs.unlink(filePath);
    } catch (e) {
      console.error('Failed to delete generated doc file:', e);
    }
  }
  await prisma.generatedDocument.deleteMany({ where: { templateId: id } });
  await prisma.template.delete({ where: { id } });
}

// Company document folders
export async function listCompanyFoldersAction(companyId: string): Promise<CompanyFolder[]> {
  await ensureCompanyRootFolder(companyId);
  const folders = await prisma.companyFolder.findMany({
    where: { companyId },
    orderBy: [{ createdAt: 'asc' }],
  });
  return folders.map(mapFolder);
}

export async function listAllCompanyFoldersAction(): Promise<CompanyFolder[]> {
  const companies = await prisma.company.findMany({ select: { id: true } });
  await Promise.all(companies.map((company) => ensureCompanyRootFolder(company.id)));
  const rows: any[] = await prisma.$queryRaw`
    SELECT id, company_id as "companyId", parent_folder_id as "parentFolderId",
           name, path, is_default as "isDefault", created_at as "createdAt", updated_at as "updatedAt"
    FROM company_folders
    ORDER BY created_at ASC
  `;
  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    parentFolderId: row.parentFolderId,
    name: row.name,
    path: row.path,
    isDefault: Boolean(row.isDefault),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }));
}

export async function createCompanyFolderAction(data: {
  companyId: string;
  parentFolderId?: string | null;
  name: string;
}): Promise<CompanyFolder> {
  const name = data.name.trim();
  if (!name || name.length > 120 || name === '.' || name === '..') {
    throw new Error('Enter a valid folder name.');
  }

  const root = await ensureCompanyRootFolder(data.companyId);
  let parent = root;
  if (data.parentFolderId) {
    const requestedParent = await prisma.companyFolder.findFirst({
      where: { id: data.parentFolderId, companyId: data.companyId },
    });
    if (!requestedParent) throw new Error('Destination folder was not found.');
    parent = requestedParent;
  }

  const folder = await prisma.companyFolder.create({
    data: {
      companyId: data.companyId,
      parentFolderId: parent.id,
      name,
      path: `${parent.path}/.pending-${crypto.randomUUID()}`,
    },
  });
  const path = `${parent.path}/${folder.id}`;
  const savedFolder = await prisma.companyFolder.update({ where: { id: folder.id }, data: { path } });
  await fs.mkdir(resolvePublicFilePath(path), { recursive: true });
  return mapFolder(savedFolder);
}

async function getDocumentDestination(documentId: string, targetFolderId: string) {
  const [document, folder] = await Promise.all([
    prisma.generatedDocument.findUnique({ where: { id: documentId } }),
    prisma.companyFolder.findUnique({ where: { id: targetFolderId } }),
  ]);
  if (!document || !folder || document.companyId !== folder.companyId) {
    throw new Error('Document and destination folder must belong to the same company.');
  }
  return { document, folder, docxUrl: `${folder.path}/${documentId}.docx` };
}

export async function moveDocumentAction(documentId: string, targetFolderId: string): Promise<Document> {
  const { document, folder, docxUrl } = await getDocumentDestination(documentId, targetFolderId);
  if (document.folderId === folder.id) throw new Error('Document is already in this folder.');

  await fs.mkdir(resolvePublicFilePath(folder.path), { recursive: true });
  await fs.rename(resolvePublicFilePath(document.docxUrl), resolvePublicFilePath(docxUrl));
  const saved = await prisma.generatedDocument.update({
    where: { id: document.id },
    data: { folderId: folder.id, docxUrl },
    include: { company: true, template: true },
  });
  return {
    id: saved.id,
    fileName: saved.fileName || (saved.variables as any)?.customFileName || null,
    folderId: saved.folderId, templateId: saved.templateId,
    templateName: saved.template.name, companyId: saved.companyId,
    companyName: saved.company.englishName, docxUrl: saved.docxUrl,
    pdfUrl: saved.pdfUrl, variables: (saved.variables as Record<string, string>) || undefined,
    generatedAt: saved.generatedAt.toISOString(), content: '',
  };
}

export async function copyDocumentAction(documentId: string, targetFolderId: string): Promise<Document> {
  const { document, folder } = await getDocumentDestination(documentId, targetFolderId);
  const copy = await prisma.generatedDocument.create({
    data: {
      companyId: document.companyId, templateId: document.templateId, folderId: folder.id,
      fileName: document.fileName || (document.variables as any)?.customFileName || null,
      docxUrl: '', pdfUrl: null, variables: document.variables ?? undefined,
    },
    include: { company: true, template: true },
  });
  const docxUrl = `${folder.path}/${copy.id}.docx`;
  try {
    await fs.mkdir(resolvePublicFilePath(folder.path), { recursive: true });
    await fs.copyFile(resolvePublicFilePath(document.docxUrl), resolvePublicFilePath(docxUrl));
    await prisma.generatedDocument.update({ where: { id: copy.id }, data: { docxUrl } });
  } catch (error) {
    await prisma.generatedDocument.delete({ where: { id: copy.id } });
    throw error;
  }
  return {
    id: copy.id,
    fileName: copy.fileName || (copy.variables as any)?.customFileName || null,
    folderId: folder.id, templateId: copy.templateId,
    templateName: copy.template.name, companyId: copy.companyId,
    companyName: copy.company.englishName, docxUrl,
    variables: (copy.variables as Record<string, string>) || undefined,
    generatedAt: copy.generatedAt.toISOString(), content: '',
  };
}

// Document mutations
export async function createDocumentAction(data: {
  companyId: string;
  templateId: string;
  content: string;
  variables: Record<string, string>;
  fileName?: string;
  templateData?: Record<string, unknown>;
}): Promise<Document> {
  // Ensure template exists in database to prevent FK constraint error
  let template = await prisma.template.findUnique({ where: { id: data.templateId } });
  if (!template) {
    template = await prisma.template.findFirst();
    if (!template) {
      throw new Error('Template not found in database. Please upload a template first.');
    }
  }
  const validTemplateId = template.id;
  const rootFolder = await ensureCompanyRootFolder(data.companyId);

  // Find designated default generation target folder for company
  let targetFolder: { id: string; path: string } | null = null;
  try {
    const defaultRows: any[] = await prisma.$queryRaw`SELECT id, path FROM company_folders WHERE company_id = ${data.companyId} AND is_default = true LIMIT 1`;
    if (defaultRows.length) {
      targetFolder = defaultRows[0];
    }
  } catch (e) {
    console.error('Query default folder raw failed:', e);
  }

  if (!targetFolder) {
    const genFolder = await prisma.companyFolder.findFirst({
      where: { companyId: data.companyId, parentFolderId: rootFolder.id, name: 'Generated' },
    });
    targetFolder = genFolder || rootFolder;
  }

  // Load company data from DB to build complete loop data (owners_list, etc.)
  const companyRecord = await prisma.company.findUnique({
    where: { id: data.companyId },
    include: {
      owners: { orderBy: { order: 'asc' } },
      witnesses: { orderBy: { order: 'asc' } },
      objectives: { orderBy: { order: 'asc' } },
    },
  });

  let fullTemplateData: Record<string, unknown> = data.templateData || {};
  if (companyRecord) {
    const builtData = buildCompanyTemplateData(companyRecord);
    fullTemplateData = {
      ...builtData,
      ...fullTemplateData,
    };
  }

  const templateName = template.name || 'Document';
  const companyName = companyRecord?.englishName || 'Company';
  const defaultFileName = `${templateName} - ${companyName}`;
  const customFileName = data.fileName?.trim() || data.variables?.customFileName?.trim() || defaultFileName;

  const d = await prisma.generatedDocument.create({
    data: {
      companyId: data.companyId,
      templateId: validTemplateId,
      folderId: targetFolder.id,
      fileName: customFileName,
      docxUrl: '',
      variables: {
        ...(data.variables as any),
        customFileName,
      },
    },
    include: {
      company: true,
      template: true,
    },
  });

  const docxUrl = `${targetFolder.path}/${d.id}.docx`;
  const filePath = resolvePublicFilePath(docxUrl);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const docxBuffer = await renderDocxTemplate(validTemplateId, data.variables, fullTemplateData);
  await fs.writeFile(filePath, docxBuffer);

  await prisma.generatedDocument.update({
    where: { id: d.id },
    data: { docxUrl },
  });

  return {
    id: d.id,
    fileName: customFileName,
    folderId: targetFolder.id,
    templateId: d.templateId,
    templateName: d.template?.name || 'Unknown Template',
    companyId: d.companyId,
    companyName: d.company?.englishName || 'Unknown Company',
    docxUrl,
    variables: data.variables,
    generatedAt: d.generatedAt.toISOString(),
    content: data.content,
  };
}

export async function deleteDocumentAction(id: string): Promise<void> {
  const d = await prisma.generatedDocument.findUnique({ where: { id } });
  if (d) {
    try {
      const filePath = resolvePublicFilePath(d.docxUrl);
      await fs.unlink(filePath);
    } catch (e) {
      console.error('Failed to delete generated doc file:', e);
    }
  }
  await prisma.generatedDocument.delete({ where: { id } });
}

export async function renameCompanyFolderAction(folderId: string, newName: string): Promise<CompanyFolder> {
  const name = newName.trim();
  if (!name || name.length > 120) {
    throw new Error('Enter a valid folder name.');
  }
  const folder = await prisma.companyFolder.findUnique({ where: { id: folderId } });
  if (!folder) throw new Error('Folder not found.');

  const updated = await prisma.companyFolder.update({
    where: { id: folderId },
    data: { name },
  });

  if (!folder.parentFolderId) {
    await prisma.company.update({
      where: { id: folder.companyId },
      data: { englishName: name },
    });
  }

  return mapFolder(updated);
}

export async function deleteCompanyFolderAction(folderId: string): Promise<void> {
  const folder = await prisma.companyFolder.findUnique({ where: { id: folderId } });
  if (!folder) return;
  if (!folder.parentFolderId) {
    throw new Error('Cannot delete the root company folder. Delete the company instead.');
  }

  const allFolders = await prisma.companyFolder.findMany({ where: { companyId: folder.companyId } });
  const getSubfolderIds = (id: string): string[] => {
    const children = allFolders.filter((f) => f.parentFolderId === id);
    return [id, ...children.flatMap((c) => getSubfolderIds(c.id))];
  };

  const folderIdsToDelete = getSubfolderIds(folderId);

  // Check if system default Generated folder is in deletion list
  const defaultGenFolder = allFolders.find((f) => f.name === 'Generated' && (f as any).isDefault);
  if (defaultGenFolder && folderIdsToDelete.includes(defaultGenFolder.id)) {
    throw new Error('The default "Generated" system folder cannot be deleted.');
  }

  const docs = await prisma.generatedDocument.findMany({
    where: { folderId: { in: folderIdsToDelete } },
  });

  for (const doc of docs) {
    try {
      const filePath = resolvePublicFilePath(doc.docxUrl);
      await fs.unlink(filePath);
    } catch (e) {
      console.error('Failed to delete file:', e);
    }
  }

  await prisma.generatedDocument.deleteMany({
    where: { folderId: { in: folderIdsToDelete } },
  });

  await prisma.companyFolder.deleteMany({
    where: { id: { in: folderIdsToDelete } },
  });

  try {
    await fs.rm(resolvePublicFilePath(folder.path), { recursive: true, force: true });
  } catch (e) {
    console.error('Failed to remove directory:', e);
  }
}

export async function moveCompanyFolderAction(folderId: string, targetParentFolderId: string): Promise<CompanyFolder> {
  const folder = await prisma.companyFolder.findUnique({ where: { id: folderId } });
  if (!folder) throw new Error('Folder not found.');
  if (!folder.parentFolderId) throw new Error('Cannot move the root company folder.');

  const targetParent = await prisma.companyFolder.findUnique({ where: { id: targetParentFolderId } });
  if (!targetParent || targetParent.companyId !== folder.companyId) {
    throw new Error('Target folder must belong to the same company.');
  }

  const updated = await prisma.companyFolder.update({
    where: { id: folderId },
    data: { parentFolderId: targetParentFolderId },
  });

  return mapFolder(updated);
}

export async function renameDocumentAction(documentId: string, fileName: string): Promise<Document> {
  const name = fileName.trim();
  if (!name) throw new Error('Document name cannot be empty.');

  const doc = await prisma.generatedDocument.findUnique({
    where: { id: documentId },
    include: { company: true, template: true },
  });
  if (!doc) throw new Error('Document not found.');

  const existingVariables = (doc.variables as Record<string, string>) || {};
  const updatedVariables = { ...existingVariables, customFileName: name };

  const updatedDoc = await prisma.generatedDocument.update({
    where: { id: documentId },
    data: { fileName: name, variables: updatedVariables },
    include: { company: true, template: true },
  });

  return {
    id: updatedDoc.id,
    fileName: name,
    folderId: updatedDoc.folderId,
    templateId: updatedDoc.templateId,
    templateName: updatedDoc.template.name,
    companyId: updatedDoc.companyId,
    companyName: updatedDoc.company.englishName,
    docxUrl: updatedDoc.docxUrl,
    pdfUrl: updatedDoc.pdfUrl,
    variables: updatedVariables,
    generatedAt: updatedDoc.generatedAt.toISOString(),
    content: '',
  };
}

export async function duplicateCompanyFolderAction(folderId: string, targetParentFolderId?: string): Promise<CompanyFolder> {
  const folder = await prisma.companyFolder.findUnique({ where: { id: folderId } });
  if (!folder) throw new Error('Folder not found.');

  const parentId = targetParentFolderId !== undefined ? targetParentFolderId : folder.parentFolderId;
  const newFolderName = `${folder.name} (Copy)`;
  const newPath = `${folder.path}_copy_${Date.now()}`;

  const newFolder = await prisma.companyFolder.create({
    data: {
      companyId: folder.companyId,
      parentFolderId: parentId,
      name: newFolderName,
      path: newPath,
    },
  });

  const copySubtree = async (sourceId: string, destId: string, destPath: string) => {
    const childFolders = await prisma.companyFolder.findMany({ where: { parentFolderId: sourceId } });
    for (const child of childFolders) {
      const childPath = `${destPath}/${child.name}`;
      const childNew = await prisma.companyFolder.create({
        data: {
          companyId: child.companyId,
          parentFolderId: destId,
          name: child.name,
          path: childPath,
        },
      });
      await copySubtree(child.id, childNew.id, childPath);
    }

    const docs = await prisma.generatedDocument.findMany({ where: { folderId: sourceId } });
    for (const doc of docs) {
      const newDocxUrl = `${destPath}/${doc.id}_copy_${Date.now()}.docx`;
      try {
        const srcFile = resolvePublicFilePath(doc.docxUrl);
        const destFile = resolvePublicFilePath(newDocxUrl);
        await fs.mkdir(path.dirname(destFile), { recursive: true });
        await fs.copyFile(srcFile, destFile);
      } catch (e) {
        console.error('Failed to copy document file:', e);
      }

      await prisma.generatedDocument.create({
        data: {
          companyId: doc.companyId,
          templateId: doc.templateId,
          folderId: destId,
          fileName: doc.fileName,
          docxUrl: newDocxUrl,
          pdfUrl: doc.pdfUrl,
          variables: doc.variables as any,
          generatedAt: new Date(),
        },
      });
    }
  };

  await copySubtree(folderId, newFolder.id, newPath);
  return mapFolder(newFolder);
}

export async function setDefaultGenerationFolderAction(folderId: string): Promise<CompanyFolder[]> {
  const target = await prisma.companyFolder.findUnique({ where: { id: folderId } });
  if (!target) throw new Error('Target folder not found.');
  if (!target.parentFolderId) {
    throw new Error('Root company folder cannot be set as default target. Please select a subfolder.');
  }

  await prisma.$executeRaw`UPDATE company_folders SET is_default = false WHERE company_id = ${target.companyId}`;
  await prisma.$executeRaw`UPDATE company_folders SET is_default = true WHERE id = ${folderId}`;

  const rows: any[] = await prisma.$queryRaw`
    SELECT id, company_id as "companyId", parent_folder_id as "parentFolderId",
           name, path, is_default as "isDefault", created_at as "createdAt", updated_at as "updatedAt"
    FROM company_folders
    WHERE company_id = ${target.companyId}
    ORDER BY created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    parentFolderId: row.parentFolderId,
    name: row.name,
    path: row.path,
    isDefault: Boolean(row.isDefault),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }));
}

