'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppData } from '@/hooks/useAppData';
import {
  Company,
  CompanyObjectiveTemplate,
  Variable,
  Template,
  Document,
  Stats,
} from '@/lib/types';

interface AppDataContextType {
  companies: Company[];
  objectives: CompanyObjectiveTemplate[];
  variables: Variable[];
  templates: Template[];
  documents: Document[];
  stats: Stats;
  loading: boolean;
  getCompany: (id: string) => Company | undefined;
  addCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  addObjective: (objective: Omit<CompanyObjectiveTemplate, 'id' | 'createdAt'>) => Promise<void>;
  updateObjective: (id: string, updates: Partial<CompanyObjectiveTemplate>) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;
  addVariable: (variable: Omit<Variable, 'id'>) => Promise<void>;
  updateVariable: (id: string, updates: Partial<Variable>) => Promise<void>;
  deleteVariable: (id: string) => Promise<void>;
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'fileUrl'>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addDocument: (document: Omit<Document, 'id' | 'generatedAt' | 'docxUrl'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
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
