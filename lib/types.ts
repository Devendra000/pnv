export interface Owner {
  id: string;
  name: string;
  role: string;
}

export interface Witness {
  id: string;
  name: string;
  role: string;
}

export interface CompanyObjective {
  id: string;
  objectiveId: string;
  text: string;
}

export interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  country: string;
  industry: string;
  singleOwner: boolean;
  owners: Owner[];
  witnesses: Witness[];
  objectives: CompanyObjective[];
  dateCreated: string;
  lastModified: string;
  documentCount: number;
}

export interface CompanyObjectiveTemplate {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Variable {
  id: string;
  name: string;
  description: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
}

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  createdDate: string;
  lastModified: string;
}

export interface Document {
  id: string;
  companyId: string;
  companyName: string;
  templateId: string;
  templateName: string;
  generatedDate: string;
  content: string;
}

export interface Stats {
  totalCompanies: number;
  totalObjectives: number;
  totalVariables: number;
  totalTemplates: number;
  totalDocumentsGenerated: number;
}
