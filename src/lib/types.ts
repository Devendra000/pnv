import { OwnerType } from '@/generated/prisma/client';

export interface Owner {
  id: string;
  name: string;
  fatherName?: string | null;
  address?: string | null;
  citizenship?: string | null;
  jariJilla?: string | null;
  shares?: string | null;
  sharePercentage?: number | null;
  order: number;
}

export interface Witness {
  id: string;
  name: string;
  fatherName?: string | null;
  address?: string | null;
  citizenship?: string | null;
  jariJilla?: string | null;
  ownerIndex?: number | null; // 1-based index of the owner this witness belongs to; null = general
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

export interface CompanyVariableValue {
  id: string;
  companyId: string;
  variableId: string;
  variableKey: string;
  variableLabel: string;
  value: string;
}

export interface Company {
  id: string;
  englishName: string;
  nepaliName?: string | null;
  ownerType: OwnerType; // 'SINGLE' | 'MULTIPLE'
  registrationDate?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  owners: Owner[];
  witnesses: Witness[];
  objectives: CompanyObjective[];
  variableValues: CompanyVariableValue[];
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
  detectedKeys?: string[];
  matchedVariables: Variable[];
}

export interface Document {
  id: string;
  templateId: string;
  templateName: string;
  companyId: string;
  companyName: string;
  docxUrl: string;
  pdfUrl?: string | null;
  variables?: Record<string, string>;
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
