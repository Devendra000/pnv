'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buildCompanyRuntimeVariableValues,
  buildCompanyTemplateData,
  isSystemVariableKey,
  TEMPLATE_LOOP_HELPER_KEYS,
} from '@/lib/companyVariables';
import { addTemplateVariableToManualAction } from '@/lib/actions';
import { resolveFormulaVariables } from '@/lib/formulaEvaluator';

function buildInitialVariableDrafts(
  company: { variableValues: Array<{ variableId: string; value: string }> } | undefined,
  template:
    | {
        matchedVariables?: Array<{ id: string; key: string; formula?: string | null }>;
        detectedKeys?: string[];
      }
    | undefined
) {
  if (!company || !template) {
    return {} as Record<string, string>;
  }

  const savedValues = new Map(company.variableValues.map((entry) => [entry.variableId, entry.value]));

  const drafts: Record<string, string> = {};
  for (const variable of (template.matchedVariables || [])) {
    // Skip auto/system variables — let them read directly from baseVariables
    if (isSystemVariableKey(variable.key) || variable.id?.startsWith('auto-')) continue;
    // Skip formula variables — their values should always be computed
    if (variable.formula) continue;
    
    const saved = savedValues.get(variable.id);
    if (saved) {
      drafts[variable.id] = saved;
    }
  }
  return drafts;
}

type TemplateVariableItem = {
  key: string;
  label: string;
  source: 'database' | 'detected';
  id?: string;
  formula?: string | null;
};

function replacePlaceholders(template: string, values: Record<string, unknown>) {
  return template.replace(/(?:\{\{|\[)\s*([A-Za-z0-9_.]+)\s*(?:\}\}|\])/g, (_, key: string) => {
    const value = values[key] ?? values[key.replace(/\s+/g, '_')];
    return value === null || value === undefined ? '' : String(value);
  });
}

function renderNestedContent(content: string, item: Record<string, unknown>): string {
  let result = content;

  // Find any nested loop sections within this item's content and expand them first
  const sectionPattern = /(?:\{\{|\[)\s*#\s*([A-Za-z0-9_.]+)\s*(?:\}\}|\])[\s\S]*?(?:\{\{|\[)\s*\/\s*\1\s*(?:\}\}|\])/g;
  const nestedKeys = new Set<string>();
  for (const match of content.matchAll(sectionPattern)) {
    nestedKeys.add(match[1]);
  }

  for (const key of nestedKeys) {
    const subItems = item[key];
    if (Array.isArray(subItems)) {
      result = renderLoopSection(result, key, subItems as Array<Record<string, unknown>>);
    } else {
      // No data for this nested key — collapse the block to empty
      const emptyPattern = new RegExp(
        `(?:\\{\\{|\\[)\\s*#\\s*${key}\\s*(?:\\}\\}|\\])([\\s\\S]*?)(?:\\{\\{|\\[)\\s*\\/\\s*${key}\\s*(?:\\}\\}|\\])`,
        'g'
      );
      result = result.replace(emptyPattern, '');
    }
  }

  return replacePlaceholders(result, item);
}

function renderLoopSection(
  template: string,
  sectionKey: string,
  items: Array<Record<string, unknown>>
) {
  const sectionPattern = new RegExp(
    `(?:\\{\\{|\\[)\\s*#\\s*${sectionKey}\\s*(?:\\}\\}|\\])([\\s\\S]*?)(?:\\{\\{|\\[)\\s*\\/\\s*${sectionKey}\\s*(?:\\}\\}|\\])`,
    'g'
  );

  return template.replace(sectionPattern, (_, sectionContent: string) => {
    return items.map((item) => renderNestedContent(sectionContent, item)).join('');
  });
}



function renderPreviewTemplate(
  template: string,
  flatVariables: Record<string, string>,
  templateData: ReturnType<typeof buildCompanyTemplateData> | null
) {
  let rendered = template;

  if (templateData) {
    rendered = renderLoopSection(rendered, 'owners_list', templateData.owners_list as Array<Record<string, unknown>>);
    rendered = renderLoopSection(rendered, 'owner_list', templateData.owners_list as Array<Record<string, unknown>>);
    rendered = renderLoopSection(rendered, 'witnesses_list', templateData.witnesses_list as Array<Record<string, unknown>>);
  }

  return replacePlaceholders(rendered, flatVariables);
}


export default function GenerateDocumentPage() {
  const router = useRouter();
  const { companies, templates, loading, addDocument, saveCompanyVariableValues, refreshData, variables } = useAppDataContext();

  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variableDrafts, setVariableDrafts] = useState<Record<string, string>>({});
  // Tracks keys that were just promoted to manual this session (key → variableId)
  const [promotedToManual, setPromotedToManual] = useState<Map<string, string>>(new Map());
  // Key currently being promoted (shows spinner on its button)
  const [promotingKey, setPromotingKey] = useState<string | null>(null);

  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // When company or template changes, reset validation state
  useEffect(() => {
    setShowValidationErrors(false);
  }, [selectedCompany, selectedTemplate]);

  const selectedCompanyRecord = companies.find((company) => company.id === selectedCompany);
  const selectedTemplateRecord = templates.find((template) => template.id === selectedTemplate);

  const handleGenerate = () => {
    // no-op: selection is enforced via disabled state in the UI
  };

  const baseVariables = useMemo(
    () => (selectedCompanyRecord ? buildCompanyRuntimeVariableValues(selectedCompanyRecord) : {} as Record<string, string>),
    [selectedCompanyRecord]
  );

  const templateData = useMemo(
    () => (selectedCompanyRecord ? buildCompanyTemplateData(selectedCompanyRecord) : null),
    [selectedCompanyRecord]
  );

  const companyVariableMap = useMemo(
    () => new Map((selectedCompanyRecord?.variableValues || []).map((entry) => [entry.variableId, entry.value])),
    [selectedCompanyRecord]
  );

  const templateVariables = useMemo<TemplateVariableItem[]>(() => {
    if (!selectedTemplateRecord) {
      return [];
    }

    const matchedKeys = new Set<string>();
    const result: TemplateVariableItem[] = [];

    // 1. Process variables that were matched in the DB
    for (const dbVar of (selectedTemplateRecord.matchedVariables || [])) {
      const globalVar = variables.find(v => v.id === dbVar.id);
      result.push({
        key: dbVar.key,
        label: dbVar.label,
        source: 'database',
        id: dbVar.id,
        formula: globalVar ? globalVar.formula : dbVar.formula,
      });
      matchedKeys.add(dbVar.key);
    }

    // 2. Process variables promoted to manual in this session
    for (const [key, variableId] of promotedToManual) {
      if (!matchedKeys.has(key)) {
        const globalVar = variables.find(v => v.id === variableId);
        result.push({ 
          key, 
          label: key, 
          source: 'database', 
          id: variableId, 
          formula: globalVar?.formula 
        });
        matchedKeys.add(key);
      }
    }

    // 3. Process detected keys (check if they exist in global variables now!)
    for (const key of (selectedTemplateRecord.detectedKeys || [])) {
      if (!matchedKeys.has(key) && !TEMPLATE_LOOP_HELPER_KEYS.has(key)) {
        const globalVar = variables.find(v => v.key === key);
        if (globalVar) {
          result.push({
            key: key,
            label: globalVar.label || key,
            source: 'database',
            id: globalVar.id,
            formula: globalVar.formula,
          });
        } else {
          result.push({
            key,
            label: key,
            source: 'detected',
          });
        }
        matchedKeys.add(key);
      }
    }

    return result;
  }, [selectedTemplateRecord, promotedToManual, variables]);

  // Single scalar variables in template (exclude loop block tags & per-row loop fields)
  const singleTemplateVariables = useMemo<TemplateVariableItem[]>(() => {
    const LOOP_ROW_FIELDS = new Set([
      'sn', 'owner_index', 'witness_index',
      'owner_name', 'owner_father_name', 'owner_address', 'owner_citizenship',
      'owner_jari_jilla', 'owner_citizenship_jari_date', 'owner_phone_number', 'owner_shares',
      'owner_witness_name', 'owner_witness_address', 'owner_witness_citizenship',
      'owner_witness_jari_jilla', 'owner_witness_citizenship_jari_date', 'owner_witness_phone_number',
      'witness_name', 'witness_address', 'witness_citizenship', 'witness_jari_jilla',
      'witness_citizenship_jari_date', 'witness_phone_number',
    ]);

    return templateVariables.filter((v) => {
      if (TEMPLATE_LOOP_HELPER_KEYS.has(v.key)) return false;
      if (LOOP_ROW_FIELDS.has(v.key)) return false;
      if (v.id?.startsWith('loop-')) return false;
      return true;
    });
  }, [templateVariables]);

  const resolvedTemplateVariables = useMemo(() => {
    if (!selectedTemplateRecord) {
      return {} as Record<string, string>;
    }

    const fullDict: Record<string, string> = { ...baseVariables };
    
    for (const v of variables) {
      const savedValue = companyVariableMap.get(v.id) || '';
      const draftValue = variableDrafts[v.key] ?? variableDrafts[v.id];
      
      let finalValue = '';
      if (v.formula) {
        finalValue = '';
      } else if (draftValue !== undefined && draftValue !== '') {
        finalValue = draftValue;
      } else if (savedValue !== '') {
        finalValue = savedValue;
      }
      
      if (finalValue !== '') {
        fullDict[v.key] = finalValue;
      }
    }

    const baseResolved = Object.fromEntries(
      templateVariables.map((variable) => {
        const draftValue = variableDrafts[variable.key] ?? (variable.id ? variableDrafts[variable.id] : undefined);
        const savedValue = variable.source === 'database' && variable.id ? companyVariableMap.get(variable.id) || '' : '';
        const autoValue = baseVariables[variable.key] || '';

        let finalValue = autoValue;
        if (variable.formula) {
          finalValue = '';
        } else if (draftValue !== undefined && draftValue !== '') {
          finalValue = draftValue;
        } else if (savedValue !== '') {
          finalValue = savedValue;
        }

        return [variable.key, finalValue];
      })
    );
    
    const combinedDict = { ...fullDict, ...baseResolved };

    const formulaMap = new Map<string, string>();
    for (const v of variables) {
      if (v.formula) formulaMap.set(v.key, v.formula);
    }
    for (const variable of templateVariables) {
      if (variable.formula && !formulaMap.has(variable.key)) {
        formulaMap.set(variable.key, variable.formula);
      }
    }

    if (formulaMap.size > 0) {
      const formulaResults = resolveFormulaVariables(formulaMap, combinedDict);
      for (const [key, val] of Object.entries(formulaResults)) {
        baseResolved[key] = val;
      }
    }

    return baseResolved;
  }, [baseVariables, companyVariableMap, selectedTemplateRecord, templateVariables, variableDrafts, variables]);

  const previewContent = useMemo(() => {
    if (!selectedTemplateRecord) {
      return '';
    }

    const mergedVariables: Record<string, string> = { ...baseVariables, ...resolvedTemplateVariables };

    return renderPreviewTemplate(selectedTemplateRecord.content, mergedVariables, templateData);
  }, [baseVariables, resolvedTemplateVariables, selectedTemplateRecord, templateData]);



  // Which loop field keys does the template actually use?
  const detectedLoopOwnerFields = useMemo(() => {
    if (!selectedTemplateRecord || !templateData) return [];
    const allDetected = new Set(selectedTemplateRecord.detectedKeys || []);
    // All possible owner loop fields from templateData row shape
    const ownerRowKeys = Object.keys(templateData.owners_list[0] || {});
    return ownerRowKeys.filter((k) => allDetected.has(k) && k !== 'sn' && k !== 'owner_index');
  }, [selectedTemplateRecord, templateData]);

  const detectedLoopWitnessFields = useMemo(() => {
    if (!selectedTemplateRecord || !templateData) return [];
    const allDetected = new Set(selectedTemplateRecord.detectedKeys || []);
    const witnessRowKeys = Object.keys(templateData.witnesses_list[0] || {});
    return witnessRowKeys.filter((k) => allDetected.has(k) && k !== 'sn' && k !== 'witness_index');
  }, [selectedTemplateRecord, templateData]);

  const ownerLoopPreview = useMemo(() => {
    if (!templateData || detectedLoopOwnerFields.length === 0) return [];
    return templateData.owners_list.map((ownerRow, idx) => ({
      sn: idx + 1,
      fields: detectedLoopOwnerFields.map((key) => ({
        key,
        value: String((ownerRow as Record<string, unknown>)[key] ?? ''),
      })),
    }));
  }, [templateData, detectedLoopOwnerFields]);

  const witnessLoopPreview = useMemo(() => {
    if (!templateData || detectedLoopWitnessFields.length === 0) return [];
    return templateData.witnesses_list.map((witnessRow, idx) => ({
      sn: idx + 1,
      fields: detectedLoopWitnessFields.map((key) => ({
        key,
        value: String((witnessRow as Record<string, unknown>)[key] ?? ''),
      })),
    }));
  }, [templateData, detectedLoopWitnessFields]);

  const canShowTemplateVariables = Boolean(
    selectedCompanyRecord && selectedTemplateRecord && singleTemplateVariables.length > 0
  );

  const canShowLoopPreview = Boolean(
    selectedCompanyRecord && selectedTemplateRecord &&
    (ownerLoopPreview.length > 0 || witnessLoopPreview.length > 0)
  );

  const missingTemplateVariables = useMemo(() => {
    if (!selectedTemplateRecord) {
      return [] as { id: string; key: string; label: string }[];
    }

    return singleTemplateVariables.filter((variable) => {
      const key = variable.key;
      const id = variable.id;
      const draftValue = variableDrafts[key] ?? (id ? variableDrafts[id] : undefined);
      const savedValue = variable.source === 'database' && id ? companyVariableMap.get(id) || '' : '';
      const autoValue = baseVariables[key] || '';

      const effectiveValue = draftValue ?? (savedValue || autoValue);
      return !effectiveValue.trim() && !variable.formula;
    });
  }, [baseVariables, companyVariableMap, selectedTemplateRecord, singleTemplateVariables, variableDrafts]);

  // Explicitly save one manual variable's current draft value back to company_variable_values
  const saveManualVariableToDB = async (variableId: string) => {
    if (!selectedCompanyRecord) return;

    const variable = singleTemplateVariables.find((v) => v.id === variableId);
    if (!variable) return;

    const value = variableDrafts[variable.key] ?? variableDrafts[variableId] ?? '';
    if (!value.trim()) return; // silently ignore — input is still empty

    await saveCompanyVariableValues(selectedCompanyRecord.id, [{ variableId, value }]);
    // No alert — the badge/hint text will update once context refreshes
  };

  // Add a template-only variable to the manual variables DB and save the company value
  const addToManualVariables = async (key: string, label: string) => {
    if (!selectedCompanyRecord) return;

    const value = variableDrafts[key] ?? '';
    if (!value.trim()) return; // silently ignore — input still empty

    setPromotingKey(key);
    try {
      const result = await addTemplateVariableToManualAction(key, label, selectedCompanyRecord.id, value);
      // Immediately update local state so UI reflects Manual + Save to DB without waiting for context refresh
      setPromotedToManual((prev) => new Map(prev).set(key, result.variableId));
      // Also store the draft by the new variableId so "Save to DB" works immediately
      setVariableDrafts((prev) => ({ ...prev, [result.variableId]: value }));
      // Refresh context in background so matchedVariables in template updates eventually
      refreshData().catch(console.error);
    } finally {
      setPromotingKey(null);
    }
  };

  const handleSave = async () => {
    if (!selectedCompanyRecord || !selectedTemplateRecord || !previewContent) return;
    if (missingTemplateVariables.length > 0) {
      setShowValidationErrors(true);
      const firstMissing = missingTemplateVariables[0];
      const element = document.getElementById(`variable-input-${firstMissing.key}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    // Store the fully-resolved values in the document record — NO DB save of variable values here
    await addDocument({
      companyId: selectedCompanyRecord.id,
      companyName: selectedCompanyRecord.englishName,
      templateId: selectedTemplateRecord.id,
      templateName: selectedTemplateRecord.name,
      content: previewContent,
      variables: { ...baseVariables, ...resolvedTemplateVariables },
      templateData: templateData || undefined,
    });

    router.push('/documents');
  };


  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Generate Document"
        description="Create a new official document from a template by selecting a company and template"
      />

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Main Panel - Inputs */}
          <div>
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-6">
                    Document Inputs
                </h2>

              {loading ? (
                <div className="text-center py-4 text-slate-500">Loading data...</div>
              ) : (
                <div className="space-y-5">
                  {/* Company Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2.5">
                      Select Company <span className="text-primary">*</span>
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        const nextCompanyId = e.target.value;
                        setSelectedCompany(nextCompanyId);
                        const nextCompany = companies.find((company) => company.id === nextCompanyId);
                        setVariableDrafts(buildInitialVariableDrafts(nextCompany, selectedTemplateRecord));
                      }}
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    >
                      <option value="">Choose a company...</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.englishName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Template Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2.5">
                      Select Template <span className="text-primary">*</span>
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        const nextTemplateId = e.target.value;
                        setSelectedTemplate(nextTemplateId);
                        const nextTemplate = templates.find((template) => template.id === nextTemplateId);
                        setVariableDrafts(buildInitialVariableDrafts(selectedCompanyRecord, nextTemplate));
                      }}
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    >
                      <option value="">Choose a template...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Generate Button */}
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-colors"
                    onClick={handleGenerate}
                  >
                    Generate Document
                  </Button>

                  {/* Company Details */}
                  {selectedCompany && selectedCompanyRecord && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h3 className="font-semibold text-foreground mb-4">
                        Company Details
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Name</p>
                          <p className="text-foreground font-medium">
                            {selectedCompanyRecord.englishName}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Ownership Type</p>
                          <p className="text-foreground font-medium font-mono text-xs">
                            {selectedCompanyRecord.ownerType}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Owners</p>
                          <p className="text-foreground font-medium">
                            {selectedCompanyRecord.owners.map((owner) => owner.name).join(', ') || 'None'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loop Data Preview — owners_list */}
                  {canShowLoopPreview && ownerLoopPreview.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30">
                          Loop
                        </span>
                        <h3 className="font-semibold text-foreground text-sm">
                          Owners in Template
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These values are filled automatically from the company owners for each row in <code className="text-xs bg-muted px-1 rounded">[#owners_list]</code>.
                      </p>
                      <div className="space-y-3">
                        {ownerLoopPreview.map((ownerRow) => (
                          <div
                            key={ownerRow.sn}
                            className="rounded-lg border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 px-3 py-3 space-y-2"
                          >
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                              Owner #{ownerRow.sn}
                            </p>
                            {ownerRow.fields.map((f) => (
                              <div key={f.key} className="flex items-start gap-2 text-xs">
                                <span className="shrink-0 font-mono text-muted-foreground w-36 truncate pt-0.5">[{f.key}]</span>
                                <span className={`font-medium flex-1 truncate ${f.value ? 'text-foreground' : 'text-rose-400 italic'}`}>
                                  {f.value || '(empty)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loop Data Preview — witnesses_list */}
                  {canShowLoopPreview && witnessLoopPreview.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-400/30">
                          Loop
                        </span>
                        <h3 className="font-semibold text-foreground text-sm">
                          Witnesses in Template
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These values are filled automatically from the company witnesses for each row in <code className="text-xs bg-muted px-1 rounded">[#witnesses_list]</code>.
                      </p>
                      <div className="space-y-3">
                        {witnessLoopPreview.map((witnessRow) => (
                          <div
                            key={witnessRow.sn}
                            className="rounded-lg border border-violet-500/20 bg-violet-50/40 dark:bg-violet-950/20 px-3 py-3 space-y-2"
                          >
                            <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-2">
                              Witness #{witnessRow.sn}
                            </p>
                            {witnessRow.fields.map((f) => (
                              <div key={f.key} className="flex items-start gap-2 text-xs">
                                <span className="shrink-0 font-mono text-muted-foreground w-36 truncate pt-0.5">[{f.key}]</span>
                                <span className={`font-medium flex-1 truncate ${f.value ? 'text-foreground' : 'text-rose-400 italic'}`}>
                                  {f.value || '(empty)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {canShowTemplateVariables && (
                    <div className="mt-6 mb-6 pt-6 border-t border-border space-y-4">
                      <h3 className="font-semibold text-foreground">Template Variables</h3>
                      <p className="text-xs text-muted-foreground -mt-2">
                        Edits here only affect this document. Use the buttons to save values back to the company permanently.
                      </p>

                      <div className="space-y-4">
                        {singleTemplateVariables.map((variable) => {
                          const companyRecord = selectedCompanyRecord;
                          if (!companyRecord) return null;

                          const key = variable.key;
                          const id = variable.id;

                          // Determine variable kind — isAuto takes priority over everything
                          const isAuto = isSystemVariableKey(key) || id?.startsWith('auto-');
                          const isGlobalVar = !isAuto && variable.source === 'database' && id && !id.startsWith('loop-');
                          const isFormula = isGlobalVar && !!variable.formula;
                          const isManual = isGlobalVar && !isFormula;
                          const isTemplateOnly = !isAuto && !isGlobalVar && variable.source === 'detected';

                          const savedValue = isManual && id
                            ? companyRecord.variableValues.find((entry) => entry.variableId === id)?.value || ''
                            : '';
                          const autoValue = baseVariables[key] || '';
                          const draftValue = variableDrafts[key] ?? (id ? variableDrafts[id] : undefined);
                          const computedValue = isFormula ? resolvedTemplateVariables[key] : '';
                          const currentValue = isFormula ? computedValue : (draftValue ?? (savedValue || autoValue));

                          const isEdited = !isFormula && draftValue !== undefined && draftValue !== (savedValue || autoValue);

                          const isMissing = showValidationErrors && !currentValue.trim() && !variable.formula;

                          return (
                            <div key={key} className={`space-y-2 rounded-lg border ${isMissing ? 'border-red-500 bg-red-50/10 dark:bg-red-500/10' : 'border-border bg-input/30'} p-4`}>
                              {/* Header row */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-medium text-foreground text-sm">{variable.label}</p>
                                    {isAuto && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-400/20 px-1.5 py-0.5 rounded">
                                        Auto
                                      </span>
                                    )}
                                    {isManual && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                                        Manual
                                      </span>
                                    )}
                                    {isFormula && (
                                      <span
                                        title={`Formula: ${variable.formula}`}
                                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded"
                                      >
                                        ⚡ Formula
                                      </span>
                                    )}
                                    {isTemplateOnly && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded">
                                        Template Only
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-mono text-muted-foreground mt-0.5">[{key}]</p>
                                </div>

                                {/* Action button — depends on kind */}
                                {isManual && id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 border-border text-foreground hover:bg-muted text-xs"
                                    onClick={() => saveManualVariableToDB(id)}
                                  >
                                    Save to DB
                                  </Button>
                                )}
                                {isTemplateOnly && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={promotingKey === key}
                                    className="shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs disabled:opacity-60"
                                    onClick={() => addToManualVariables(key, variable.label)}
                                  >
                                    {promotingKey === key ? (
                                      <span className="flex items-center gap-1.5">
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Saving...
                                      </span>
                                    ) : '+ Add as Manual'}
                                  </Button>
                                )}
                              </div>

                              {/* Input */}
                              {variable.formula ? (
                                <div className="space-y-1.5">
                                  <div className={`flex items-center rounded-md border px-3 py-2 text-sm font-mono ${
                                    !currentValue
                                      ? 'border-border bg-input/10 text-muted-foreground'
                                      : 'border-border bg-muted/40 text-foreground'
                                  }`}>
                                    {!currentValue ? <span className="italic">waiting to compute...</span> : currentValue}
                                  </div>
                                  <p className="text-[11px] font-medium text-amber-600/80 dark:text-amber-500/80">
                                    ⚡ Formula: <code className="font-mono bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded text-[10px]">{variable.formula}</code>
                                  </p>
                                </div>
                              ) : (
                                <Input
                                  id={`variable-input-${key}`}
                                  value={currentValue}
                                  onChange={(event) => {
                                    if (showValidationErrors) setShowValidationErrors(false);
                                    setVariableDrafts((prev) => ({
                                      ...prev,
                                      [key]: event.target.value,
                                      ...(id ? { [id]: event.target.value } : {}),
                                    }));
                                  }}
                                  placeholder={`Enter value for ${variable.label}`}
                                  className={`bg-background text-sm ${isMissing ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                              )}
                              {isMissing && <p className="text-[11px] font-medium text-red-500 mt-1">This variable is required to generate the document.</p>}

                              {/* Status hint */}
                              {!variable.formula && (
                                <p className="text-xs text-muted-foreground">
                                  {isEdited ? (
                                    <span className="text-amber-500 font-medium">✎ Customized for this document run only</span>
                                  ) : isAuto ? (
                                    'Auto-filled from company data. Edits apply to this document only.'
                                  ) : savedValue ? (
                                    'Company value loaded. Edits apply to this document only.'
                                  ) : isManual ? (
                                    'No saved value yet for this company.'
                                  ) : (
                                    'Not in database. Fill a value or click "+ Add as Manual" to save it.'
                                  )}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {Boolean(selectedCompany && selectedTemplate) && (
                <div className="sticky bottom-0 z-10 bg-card flex gap-3 mt-6 pt-4 border-t border-border -mx-6 -mb-6 px-6 pb-6 rounded-b-xl shadow-[0_-12px_16px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_-12px_16px_-4px_rgba(0,0,0,0.2)]">
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-colors"
                    onClick={handleSave}
                  >
                    Save Document
                  </Button>
                  <Button
                    variant="outline"
                    className="px-6 border-border text-foreground hover:bg-muted"
                    onClick={() => {
                      setSelectedCompany('');
                      setSelectedTemplate('');
                      setVariableDrafts({});
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
