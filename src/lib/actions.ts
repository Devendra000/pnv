'use server';

import { prisma } from './prisma';
import { promises as fs } from 'fs';
import path from 'path';
import {
  Company as DBCompany,
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
} from './types';

// Helper to read content from disk
async function readFileContent(relativeUrl: string): Promise<string> {
  if (!relativeUrl) return '';
  try {
    const filePath = path.join(process.cwd(), 'public', relativeUrl);
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file at ${relativeUrl}:`, error);
    return 'File content not found on disk.';
  }
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
        const content = await readFileContent(t.fileUrl);
        return {
          id: t.id,
          name: t.name,
          fileUrl: t.fileUrl,
          createdAt: t.createdAt.toISOString(),
          content,
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
      documents: true,
    },
  });

  return {
    id: c.id,
    name: c.name,
    ownerType: c.ownerType,
    registrationDate: c.registrationDate ? c.registrationDate.toISOString().split('T')[0] : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    owners: c.owners.map((o) => ({ id: o.id, name: o.name, address: o.address, sharePercentage: o.sharePercentage, order: o.order })),
    witnesses: c.witnesses.map((w) => ({ id: w.id, name: w.name, address: w.address, order: w.order })),
    objectives: c.objectives.map((o) => ({ id: o.id, companyId: o.companyId, sourceObjectiveId: o.sourceObjectiveId, text: o.text, order: o.order })),
    documentCount: c.documents.length,
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
      documents: true,
    },
  });

  return {
    id: c.id,
    name: c.name,
    ownerType: c.ownerType,
    registrationDate: c.registrationDate ? c.registrationDate.toISOString().split('T')[0] : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    owners: c.owners.map((o) => ({ id: o.id, name: o.name, address: o.address, sharePercentage: o.sharePercentage, order: o.order })),
    witnesses: c.witnesses.map((w) => ({ id: w.id, name: w.name, address: w.address, order: w.order })),
    objectives: c.objectives.map((o) => ({ id: o.id, companyId: o.companyId, sourceObjectiveId: o.sourceObjectiveId, text: o.text, order: o.order })),
    documentCount: c.documents.length,
  };
}

export async function deleteCompanyAction(id: string): Promise<void> {
  const docs = await prisma.generatedDocument.findMany({ where: { companyId: id } });
  for (const doc of docs) {
    try {
      const filePath = path.join(process.cwd(), 'public', doc.docxUrl);
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
export async function createTemplateAction(data: { name: string; content: string }): Promise<Template> {
  const t = await prisma.template.create({
    data: {
      name: data.name,
      fileUrl: '', // Will set below
    },
  });

  const fileUrl = `/uploads/templates/${t.id}.txt`;
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'templates', `${t.id}.txt`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data.content, 'utf8');

  await prisma.template.update({
    where: { id: t.id },
    data: { fileUrl },
  });

  return {
    id: t.id,
    name: t.name,
    fileUrl,
    createdAt: t.createdAt.toISOString(),
    content: data.content,
  };
}

export async function updateTemplateAction(id: string, data: { name: string; content: string }): Promise<Template> {
  const t = await prisma.template.update({
    where: { id },
    data: {
      name: data.name,
    },
  });

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'templates', `${id}.txt`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data.content, 'utf8');

  return {
    id: t.id,
    name: t.name,
    fileUrl: t.fileUrl,
    createdAt: t.createdAt.toISOString(),
    content: data.content,
  };
}

export async function deleteTemplateAction(id: string): Promise<void> {
  const t = await prisma.template.findUnique({ where: { id } });
  if (t) {
    try {
      const filePath = path.join(process.cwd(), 'public', t.fileUrl);
      await fs.unlink(filePath);
    } catch (e) {
      console.error('Failed to delete file:', e);
    }
  }

  const docs = await prisma.generatedDocument.findMany({ where: { templateId: id } });
  for (const doc of docs) {
    try {
      const filePath = path.join(process.cwd(), 'public', doc.docxUrl);
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
}): Promise<Document> {
  const d = await prisma.generatedDocument.create({
    data: {
      companyId: data.companyId,
      templateId: data.templateId,
      docxUrl: '', // Will set below
    },
    include: {
      company: true,
      template: true,
    },
  });

  const docxUrl = `/uploads/generated/${d.id}.txt`;
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'generated', `${d.id}.txt`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data.content, 'utf8');

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
      const filePath = path.join(process.cwd(), 'public', d.docxUrl);
      await fs.unlink(filePath);
    } catch (e) {
      console.error('Failed to delete generated doc file:', e);
    }
  }
  await prisma.generatedDocument.delete({ where: { id } });
}
