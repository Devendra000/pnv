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
      setVariables((prev) => {
        const existing = prev.find((v) => v.id === id);
        if (!existing) return prev;
        const updated = { ...existing, ...updates };

        updateVariableAction(id, updated).then((saved) => {
          setVariables((current) => current.map((v) => (v.id === id ? saved : v)));
        });

        return prev.map((v) => (v.id === id ? updated : v));
      });
    } catch (error) {
      console.error('Error updating variable:', error);
    }
  }, []);

  const deleteVariable = useCallback(async (id: string) => {
    try {
      await deleteVariableAction(id);
      setVariables((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Error deleting variable:', error);
    }
  }, []);

  // Templates operations
  const addTemplate = useCallback(async (template: Omit<Template, 'id' | 'createdAt' | 'fileUrl'>) => {
    try {
      const created = await createTemplateAction({ name: template.name, content: template.content });
      setTemplates((prev) => [...prev, created]);
    } catch (error) {
      console.error('Error adding template:', error);
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<Template>) => {
    try {
      setTemplates((prev) => {
        const existing = prev.find((t) => t.id === id);
        if (!existing) return prev;
        const updated = { ...existing, ...updates };

        updateTemplateAction(id, { name: updated.name, content: updated.content }).then((saved) => {
          setTemplates((current) => current.map((t) => (t.id === id ? saved : t)));
        });

        return prev.map((t) => (t.id === id ? updated : t));
      });
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
  const addDocument = useCallback(async (document: Omit<Document, 'id' | 'generatedAt' | 'docxUrl'>) => {
    try {
      const created = await createDocumentAction({
        companyId: document.companyId,
        templateId: document.templateId,
        content: document.content,
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
