'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Company,
  CompanyObjectiveTemplate,
  Variable,
  Template,
  Document,
  Stats,
} from '@/lib/types';
import {
  fetchAppData,
  createCompanyAction,
  updateCompanyAction,
  deleteCompanyAction,
  saveCompanyVariableValuesAction,
  createObjectiveAction,
  updateObjectiveAction,
  deleteObjectiveAction,
  createVariableAction,
  updateVariableAction,
  deleteVariableAction,
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
  createDocumentAction,
  deleteDocumentAction,
} from '@/lib/actions';

export const useAppData = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [objectives, setObjectives] = useState<CompanyObjectiveTemplate[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data from DB on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const data = await fetchAppData();
        if (active) {
          setCompanies(data.companies);
          setObjectives(data.objectives);
          setVariables(data.variables);
          setTemplates(data.templates);
          setDocuments(data.documents);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  // Company operations
  const getCompany = useCallback(
    (id: string) => companies.find((c) => c.id === id),
    [companies]
  );

  const arrayBufferToBase64 = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  };

  const addCompany = useCallback(async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>) => {
    try {
      const created = await createCompanyAction(company);
      setCompanies((prev) => [...prev, created]);
    } catch (error) {
      console.error('Error adding company:', error);
    }
  }, []);

  const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
    try {
      const saved = await updateCompanyAction(id, updates as Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>);
      setCompanies((prev) => prev.map((c) => (c.id === id ? saved : c)));
    } catch (error) {
      console.error('Error updating company:', error);
    }
  }, []);

  const saveCompanyVariableValues = useCallback(async (companyId: string, values: Array<{ variableId: string; value: string }>) => {
    try {
      const savedValues = await saveCompanyVariableValuesAction(companyId, values);
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === companyId ? { ...company, variableValues: savedValues } : company
        )
      );
      return savedValues;
    } catch (error) {
      console.error('Error saving company variable values:', error);
      throw error;
    }
  }, []);

  const deleteCompany = useCallback(async (id: string) => {
    try {
      await deleteCompanyAction(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      // Re-fetch documents since some might be cascade deleted
      const data = await fetchAppData();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  }, []);

  // Objectives operations
  const addObjective = useCallback(async (objective: Omit<CompanyObjectiveTemplate, 'id' | 'createdAt'>) => {
    try {
      const created = await createObjectiveAction(objective.text);
      setObjectives((prev) => [...prev, created]);
    } catch (error) {
      console.error('Error adding objective:', error);
    }
  }, []);

  const updateObjective = useCallback(async (id: string, updates: Partial<CompanyObjectiveTemplate>) => {
    try {
      if (updates.text !== undefined) {
        const updated = await updateObjectiveAction(id, updates.text);
        setObjectives((prev) =>
          prev.map((o) => (o.id === id ? updated : o))
        );
      }
    } catch (error) {
      console.error('Error updating objective:', error);
    }
  }, []);

  const deleteObjective = useCallback(async (id: string) => {
    try {
      await deleteObjectiveAction(id);
      setObjectives((prev) => prev.filter((o) => o.id !== id));
    } catch (error) {
      console.error('Error deleting objective:', error);
    }
  }, []);

  // Variables operations
  const addVariable = useCallback(async (variable: Omit<Variable, 'id'>) => {
    try {
      const created = await createVariableAction(variable);
      setVariables((prev) => [...prev, created]);
    } catch (error) {
      console.error('Error adding variable:', error);
    }
  }, []);

  const updateVariable = useCallback(async (id: string, updates: Partial<Variable>) => {
    try {
      const existing = variables.find((v) => v.id === id);
      if (!existing) return;

      const updated = { ...existing, ...updates };
      setVariables((prev) => prev.map((v) => (v.id === id ? updated : v)));

      const saved = await updateVariableAction(id, updated);
      setVariables((current) => current.map((v) => (v.id === id ? saved : v)));
    } catch (error) {
      console.error('Error updating variable:', error);
    }
  }, [variables]);

  const deleteVariable = useCallback(async (id: string) => {
    try {
      await deleteVariableAction(id);
      setVariables((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Error deleting variable:', error);
    }
  }, []);

  // Templates operations
  const addTemplate = useCallback(async (template: { name: string; file: File }) => {
    try {
      const fileData = await arrayBufferToBase64(template.file);
      const created = await createTemplateAction({
        name: template.name,
        fileName: template.file.name,
        fileData,
      });
      setTemplates((prev) => [...prev, created]);
    } catch (error) {
      console.error('Error adding template:', error);
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: { name: string; file?: File | null }) => {
    try {
      const payload: { name: string; fileName?: string; fileData?: string } = {
        name: updates.name,
      };

      if (updates.file) {
        payload.fileName = updates.file.name;
        payload.fileData = await arrayBufferToBase64(updates.file);
      }

      const saved = await updateTemplateAction(id, payload);
      setTemplates((prev) => prev.map((t) => (t.id === id ? saved : t)));
    } catch (error) {
      console.error('Error updating template:', error);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await deleteTemplateAction(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      // Re-fetch documents since some might be cascade deleted
      const data = await fetchAppData();
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  }, []);

  // Documents operations
  const addDocument = useCallback(async (document: Omit<Document, 'id' | 'generatedAt' | 'docxUrl'> & { variables: Record<string, string>; templateData?: import('@/lib/companyVariables').CompanyTemplateData }) => {
    try {
      const created = await createDocumentAction({
        companyId: document.companyId,
        templateId: document.templateId,
        content: document.content,
        variables: document.variables,
        templateData: document.templateData,
      });
      setDocuments((prev) => [...prev, created]);
    } catch (error) {
      console.error('Error adding document:', error);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      await deleteDocumentAction(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
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
    loading,
    getCompany,
    addCompany,
    updateCompany,
    saveCompanyVariableValues,
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
