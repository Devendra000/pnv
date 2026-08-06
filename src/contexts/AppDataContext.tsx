'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppData } from '@/hooks/useAppData';
import {
  Company,
  CompanyObjectiveTemplate,
  ObjectiveCategory,
  Variable,
  Template,
  Document,
  Stats,
  OwnerRole,
} from '@/lib/types';
import { CompanyTemplateData } from '@/lib/companyVariables';

interface AppDataContextType {
  companies: Company[];
  objectiveCategories: ObjectiveCategory[];
  objectives: CompanyObjectiveTemplate[];
  variables: Variable[];
  templates: Template[];
  documents: Document[];
  ownerRoles: OwnerRole[];
  stats: Stats;
  loading: boolean;
  refreshData: () => Promise<void>;
  getCompany: (id: string) => Company | undefined;
  addCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  saveCompanyVariableValues: (companyId: string, values: Array<{ variableId: string; value: string }>) => Promise<unknown>;
  deleteCompany: (id: string) => Promise<void>;
  addObjectiveCategory: (cat: { name: string; description?: string; order?: number }) => Promise<void>;
  updateObjectiveCategory: (id: string, updates: { name: string; description?: string; order?: number }) => Promise<void>;
  deleteObjectiveCategory: (id: string) => Promise<void>;
  addObjective: (objective: Omit<CompanyObjectiveTemplate, 'id' | 'createdAt'>) => Promise<void>;
  updateObjective: (id: string, updates: Partial<CompanyObjectiveTemplate>) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;
  addVariable: (variable: Omit<Variable, 'id'>) => Promise<void>;
  updateVariable: (id: string, updates: Partial<Variable>) => Promise<void>;
  deleteVariable: (id: string) => Promise<void>;
  addOwnerRole: (name: string) => Promise<void>;
  updateOwnerRole: (id: string, name: string) => Promise<void>;
  deleteOwnerRole: (id: string) => Promise<void>;
  addTemplate: (template: { name: string; file: File }) => Promise<void>;
  updateTemplate: (id: string, updates: { name: string; file?: File | null }) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addDocument: (
    document: Omit<Document, 'id' | 'generatedAt' | 'docxUrl'> & {
      variables: Record<string, string>;
      fileName?: string | null;
      templateData?: CompanyTemplateData;
    }
  ) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  appendDocumentsLocally: (docs: Document[]) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const appData = useAppData();

  return (
    <AppDataContext.Provider value={appData}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppDataContext() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppDataContext must be used within AppDataProvider');
  }
  return context;
}
