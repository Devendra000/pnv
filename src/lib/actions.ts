'use server';

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { prisma } from './prisma';
import { promises as fs } from 'fs';
import path from 'path';
import {
  Company,
  CompanyObjectiveTemplate,
  ObjectiveCategory,
  Variable as UIVariable,
  Template,
  Document,
  Stats,
  CompanyVariableValue as UICompanyVariableValue,
} from './types';
import {
  buildCompanyRuntimeVariableValues,
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

function resolvePublicFilePath(relativeUrl: string) {
  return path.join(process.cwd(), 'public', relativeUrl.replace(/^\/+/, ''));
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
    registrationDate?: string | Date | null;
    owners: Array<{
      name: string;
      fatherName?: string | null;
      address?: string | null;
      citizenship?: string | null;
      jariJilla?: string | null;
      shares?: string | null;
      sharePercentage?: number | null;
      order?: number;
    }>;
    witnesses: Array<{
      name: string;
      fatherName?: string | null;
      address?: string | null;
      citizenship?: string | null;
      jariJilla?: string | null;
      order?: number;
    }>;
    objectives: Array<{ text: string; order?: number }>;
    variableValues: Array<{ variableId: string; value: string }>;
  }
) {
  const derivedValues = buildCompanyRuntimeVariableValues(data);
  const variableIds = data.variableValues.map((entry) => entry.variableId);
  const variables = variableIds.length
    ? await prisma.variable.findMany({ where: { id: { in: variableIds } } })
    : [];
  const variableKeyById = new Map(variables.map((variable) => [variable.id, variable.key]));

  for (const entry of data.variableValues) {
    const key = variableKeyById.get(entry.variableId);
    if (!key || entry.value.trim() === '') {
      continue;
    }

    derivedValues[key] = entry.value;
  }

  const keys = Object.keys(derivedValues);
  const savedVariables = await Promise.all(keys.map((key) => ensureVariableForKey(key)));
  const variableIdByKey = new Map(savedVariables.map((variable) => [variable.key, variable.id]));

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
    ...createReplacementMap(variables),
    ...(templateData || {}),
  };

  for (const [key, value] of Object.entries(variables)) {
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

    doc.setData(mergedData);
    doc.render();

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
      registrationDate: c.registrationDate ? c.registrationDate.toISOString().split('T')[0] : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      owners: c.owners.map((o) => ({
        id: o.id,
        name: o.name,
        fatherName: o.fatherName,
        address: o.address,
        citizenship: o.citizenship,
        jariJilla: o.jariJilla,
        shares: o.shares,
        sharePercentage: o.sharePercentage,
        order: o.order,
      })),
      witnesses: c.witnesses.map((w) => ({
        id: w.id,
        name: w.name,
        fatherName: w.fatherName,
        address: w.address,
        citizenship: w.citizenship,
        jariJilla: w.jariJilla,
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
          templateId: d.templateId,
          templateName: d.template?.name || 'Unknown Template',
          companyId: d.companyId,
          companyName: d.company?.englishName || 'Unknown Company',
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

// Company mutations
export async function createCompanyAction(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>): Promise<Company> {
  const c = await prisma.company.create({
    data: {
      englishName: data.englishName,
      nepaliName: data.nepaliName || '',
      ownerType: data.ownerType,
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      owners: {
        create: data.owners.map((o, idx) => ({
          name: o.name,
          fatherName: o.fatherName || null,
          address: o.address || null,
          citizenship: o.citizenship || null,
          jariJilla: o.jariJilla || null,
          shares: o.shares || null,
          sharePercentage: o.sharePercentage ?? null,
          order: idx,
        })),
      },
      witnesses: {
        create: data.witnesses.map((w, idx) => ({
          name: w.name,
          fatherName: w.fatherName || null,
          address: w.address || null,
          citizenship: w.citizenship || null,
          jariJilla: w.jariJilla || null,
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

  await syncCompanyVariableValues(c.id, {
    ...data,
    registrationDate: data.registrationDate ?? null,
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
    registrationDate: reloaded.registrationDate ? reloaded.registrationDate.toISOString().split('T')[0] : null,
    createdAt: reloaded.createdAt.toISOString(),
    updatedAt: reloaded.updatedAt.toISOString(),
    owners: reloaded.owners.map((o) => ({
      id: o.id,
      name: o.name,
      fatherName: o.fatherName,
      address: o.address,
      citizenship: o.citizenship,
      jariJilla: o.jariJilla,
      shares: o.shares,
      sharePercentage: o.sharePercentage,
      order: o.order,
    })),
    witnesses: reloaded.witnesses.map((w) => ({
      id: w.id,
      name: w.name,
      fatherName: w.fatherName,
      address: w.address,
      citizenship: w.citizenship,
      jariJilla: w.jariJilla,
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
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      owners: {
        create: data.owners.map((o, idx) => ({
          name: o.name,
          fatherName: o.fatherName || null,
          address: o.address || null,
          citizenship: o.citizenship || null,
          jariJilla: o.jariJilla || null,
          shares: o.shares || null,
          sharePercentage: o.sharePercentage ?? null,
          order: idx,
        })),
      },
      witnesses: {
        create: data.witnesses.map((w, idx) => ({
          name: w.name,
          fatherName: w.fatherName || null,
          address: w.address || null,
          citizenship: w.citizenship || null,
          jariJilla: w.jariJilla || null,
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

  await syncCompanyVariableValues(c.id, {
    ...data,
    registrationDate: data.registrationDate ?? null,
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
    registrationDate: reloaded.registrationDate ? reloaded.registrationDate.toISOString().split('T')[0] : null,
    createdAt: reloaded.createdAt.toISOString(),
    updatedAt: reloaded.updatedAt.toISOString(),
    owners: reloaded.owners.map((o) => ({
      id: o.id,
      name: o.name,
      fatherName: o.fatherName,
      address: o.address,
      citizenship: o.citizenship,
      jariJilla: o.jariJilla,
      shares: o.shares,
      sharePercentage: o.sharePercentage,
      order: o.order,
    })),
    witnesses: reloaded.witnesses.map((w) => ({
      id: w.id,
      name: w.name,
      fatherName: w.fatherName,
      address: w.address,
      citizenship: w.citizenship,
      jariJilla: w.jariJilla,
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

// Document mutations
export async function createDocumentAction(data: {
  companyId: string;
  templateId: string;
  content: string;
  variables: Record<string, string>;
  templateData?: Record<string, unknown>;
}): Promise<Document> {
  const d = await prisma.generatedDocument.create({
    data: {
      companyId: data.companyId,
      templateId: data.templateId,
      docxUrl: '',
      variables: data.variables as any,
    },
    include: {
      company: true,
      template: true,
    },
  });

  const docxUrl = `/uploads/generated/${d.id}.docx`;
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'generated', `${d.id}.docx`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const docxBuffer = await renderDocxTemplate(data.templateId, data.variables, data.templateData);
  await fs.writeFile(filePath, docxBuffer);

  await prisma.generatedDocument.update({
    where: { id: d.id },
    data: { docxUrl },
  });

  return {
    id: d.id,
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