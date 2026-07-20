'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Company,
  CompanyObjectiveTemplate,
  Variable,
  Template,
  Document,
  Stats,
} from '@/lib/types';
import {
  mockCompanies,
  mockObjectives,
  mockVariables,
  mockTemplates,
  mockDocuments,
} from '@/lib/mockData';

export const useAppData = () => {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [objectives, setObjectives] = useState<CompanyObjectiveTemplate[]>(mockObjectives);
  const [variables, setVariables] = useState<Variable[]>(mockVariables);
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);

  // Company operations
  const getCompany = useCallback(
    (id: string) => companies.find((c) => c.id === id),
    [companies]
  );

  const addCompany = useCallback((company: Company) => {
    setCompanies((prev) => [...prev, company]);
  }, []);

  const updateCompany = useCallback((id: string, updates: Partial<Company>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, lastModified: new Date().toISOString().split('T')[0] } : c))
    );
  }, []);

  const deleteCompany = useCallback((id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Objectives operations
  const addObjective = useCallback((objective: CompanyObjectiveTemplate) => {
    setObjectives((prev) => [...prev, objective]);
  }, []);

  const updateObjective = useCallback((id: string, updates: Partial<CompanyObjectiveTemplate>) => {
    setObjectives((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  }, []);

  const deleteObjective = useCallback((id: string) => {
    setObjectives((prev) => prev.filter((o) => o.id !== id));
  }, []);

  // Variables operations
  const addVariable = useCallback((variable: Variable) => {
    setVariables((prev) => [...prev, variable]);
  }, []);

  const updateVariable = useCallback((id: string, updates: Partial<Variable>) => {
    setVariables((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  }, []);

  const deleteVariable = useCallback((id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  }, []);

  // Templates operations
  const addTemplate = useCallback((template: Template) => {
    setTemplates((prev) => [...prev, template]);
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<Template>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, lastModified: new Date().toISOString().split('T')[0] } : t))
    );
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Documents operations
  const addDocument = useCallback((document: Document) => {
    setDocuments((prev) => [...prev, document]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Stats calculation
  const stats: Stats = useMemo(
    () => ({
      totalCompanies: companies.length,
      totalObjectives: objectives.length,
      totalVariables: variables.length,
      totalTemplates: templates.length,
      totalDocumentsGenerated: documents.length,
    }),
    [companies.length, objectives.length, variables.length, templates.length, documents.length]
  );

  return {
    companies,
    objectives,
    variables,
    templates,
    documents,
    stats,
    getCompany,
    addCompany,
    updateCompany,
    deleteCompany,
    addObjective,
    updateObjective,
    deleteObjective,
    addVariable,
    updateVariable,
    deleteVariable,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addDocument,
    deleteDocument,
  };
};
