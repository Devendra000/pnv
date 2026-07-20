import { OwnerType } from '@/generated/prisma/client';

export interface Owner {
  id: string;
  name: string;
  address?: string | null;
  sharePercentage?: number | null;
  order: number;
}

export interface Witness {
  id: string;
  name: string;
  address?: string | null;
  order: number;
}

export interface CompanyObjectiveTemplate {
  id: string;
  text: string;
  createdAt?: string | Date;
}

export interface CompanyObjective {
  id: string;
  companyId: string;
  sourceObjectiveId: string | null;
  text: string;
  order: number;
}

export interface Company {
  id: string;
  name: string;
  ownerType: OwnerType; // 'SINGLE' | 'MULTIPLE'
  registrationDate?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  owners: Owner[];
  witnesses: Witness[];
  objectives: CompanyObjective[];
  documentCount?: number;
}

export interface Variable {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'list';
}

export interface Template {
  id: string;
  name: string;
  fileUrl: string;
  createdAt: string | Date;
  content: string; // The file contents read from fileUrl on server
}

export interface Document {
  id: string;
  templateId: string;
  templateName: string;
  companyId: string;
  companyName: string;
  docxUrl: string;
  pdfUrl?: string | null;
  generatedAt: string | Date;
  content: string; // The file contents read from docxUrl on server
}

export interface Stats {
  totalCompanies: number;
  totalObjectives: number;
  totalVariables: number;
  totalTemplates: number;
  totalDocumentsGenerated: number;
}
