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
  getCompany: (id: string) => Company | undefined;
  addCompany: (company: Company) => void;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  addObjective: (objective: CompanyObjectiveTemplate) => void;
  updateObjective: (id: string, updates: Partial<CompanyObjectiveTemplate>) => void;
  deleteObjective: (id: string) => void;
  addVariable: (variable: Variable) => void;
  updateVariable: (id: string, updates: Partial<Variable>) => void;
  deleteVariable: (id: string) => void;
  addTemplate: (template: Template) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  addDocument: (document: Document) => void;
  deleteDocument: (id: string) => void;
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
