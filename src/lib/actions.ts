'use server';

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { prisma } from './prisma';
import { promises as fs } from 'fs';
import path from 'path';
import {
  CompanyOwner,
  CompanyWitness,
  CompanyObjective,
  Objective,
  Variable,
  Template as DBTemplate,
  GeneratedDocument as DBDocument,
} from '@/generated/prisma/client';
import {
  Company,
  Owner,
  Witness,
  CompanyObjectiveTemplate,
  Variable as UIVariable,
  Template,
  Document,
  Stats,
  CompanyVariableValue as UICompanyVariableValue,
} from './types';
import {
  buildCompanyRuntimeVariableValues,
  buildCompanyTemplateData,
} from '@/lib/companyVariables';
import { extractDocxTemplateData } from '@/lib/templateParser';

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
    name: string;
    ownerType: 'SINGLE' | 'MULTIPLE';
    registrationDate?: string | Date | null;
    owners: Array<{ name: string; address?: string | null; sharePercentage?: number | null; order?: number }>;
    witnesses: Array<{ name: string; address?: string | null; order?: number }>;
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

  const replacements = Object.entries(createReplacementMap(variables)).map(([key, value]) => ({
    pattern: new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g'),
    value: escapeXml(value),
  }));

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
  const zip = new PizZip(templateBuffer);

  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
    });

    doc.setData(templateData || createReplacementMap(variables));
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
      name: c.name,
      ownerType: c.ownerType,
      registrationDate: c.registrationDate ? c.registrationDate.toISOString().split('T')[0] : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      owners: c.owners.map((o) => ({
        id: o.id,
        name: o.name,
        address: o.address,
        sharePercentage: o.sharePercentage,
        order: o.order,
      })),
      witnesses: c.witnesses.map((w) => ({
        id: w.id,
        name: w.name,
        address: w.address,
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

    // 2. Fetch Global Objectives
    const dbObjectives = await prisma.objective.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const objectives: CompanyObjectiveTemplate[] = dbObjectives.map((o) => ({
      id: o.id,
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
      type: v.type as any,
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
          companyName: d.company?.name || 'Unknown Company',
          docxUrl: d.docxUrl,
          pdfUrl: d.pdfUrl,
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
      name: data.name,
      ownerType: data.ownerType,
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      owners: {
        create: data.owners.map((o, idx) => ({
          name: o.name,
          address: o.address || null,
          sharePercentage: o.sharePercentage || null,
          order: idx,
        })),
      },
      witnesses: {
        create: data.witnesses.map((w, idx) => ({
          name: w.name,
          address: w.address || null,
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
    name: reloaded.name,
    ownerType: reloaded.ownerType,
    registrationDate: reloaded.registrationDate ? reloaded.registrationDate.toISOString().split('T')[0] : null,
    createdAt: reloaded.createdAt.toISOString(),
    updatedAt: reloaded.updatedAt.toISOString(),
    owners: reloaded.owners.map((o) => ({ id: o.id, name: o.name, address: o.address, sharePercentage: o.sharePercentage, order: o.order })),
    witnesses: reloaded.witnesses.map((w) => ({ id: w.id, name: w.name, address: w.address, order: w.order })),
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
      name: data.name,
      ownerType: data.ownerType,
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      owners: {
        create: data.owners.map((o, idx) => ({
          name: o.name,
          address: o.address || null,
          sharePercentage: o.sharePercentage || null,
          order: idx,
        })),
      },
      witnesses: {
        create: data.witnesses.map((w, idx) => ({
          name: w.name,
          address: w.address || null,
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
    name: reloaded.name,
    ownerType: reloaded.ownerType,
    registrationDate: reloaded.registrationDate ? reloaded.registrationDate.toISOString().split('T')[0] : null,
    createdAt: reloaded.createdAt.toISOString(),
    updatedAt: reloaded.updatedAt.toISOString(),
    owners: reloaded.owners.map((o) => ({ id: o.id, name: o.name, address: o.address, sharePercentage: o.sharePercentage, order: o.order })),
    witnesses: reloaded.witnesses.map((w) => ({ id: w.id, name: w.name, address: w.address, order: w.order })),
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

// Objective mutations
export async function createObjectiveAction(text: string): Promise<CompanyObjectiveTemplate> {
  const o = await prisma.objective.create({
    data: { text },
  });
  return {
    id: o.id,
    text: o.text,
    createdAt: o.createdAt.toISOString(),
  };
}

export async function updateObjectiveAction(id: string, text: string): Promise<CompanyObjectiveTemplate> {
  const o = await prisma.objective.update({
    where: { id },
    data: { text },
  });
  return {
    id: o.id,
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
    type: v.type as any,
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
    type: v.type as any,
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
    type: v.type as any,
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
    type: v.type as any,
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
    companyName: d.company?.name || 'Unknown Company',
    docxUrl,
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