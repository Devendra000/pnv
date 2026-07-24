'use client';

import { useMemo, useState } from 'react';
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

function buildInitialVariableDrafts(
  company: { variableValues: Array<{ variableId: string; value: string }> } | undefined,
  template:
    | {
        matchedVariables?: Array<{ id: string; key: string }>;
        detectedKeys?: string[];
      }
    | undefined
) {
  if (!company || !template) {
    return {} as Record<string, string>;
  }

  const savedValues = new Map(company.variableValues.map((entry) => [entry.variableId, entry.value]));

  return Object.fromEntries(
    (template.matchedVariables || []).map((variable) => [variable.id, savedValues.get(variable.id) || ''])
  ) as Record<string, string>;
}

type TemplateVariableItem = {
  key: string;
  label: string;
  source: 'database' | 'detected';
  id?: string;
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
  const { companies, templates, loading, addDocument, saveCompanyVariableValues } = useAppDataContext();

  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variableDrafts, setVariableDrafts] = useState<Record<string, string>>({});

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

    const databaseVariables = (selectedTemplateRecord.matchedVariables || []).map((variable) => ({
      key: variable.key,
      label: variable.label,
      source: 'database' as const,
      id: variable.id,
    }));

    const matchedKeys = new Set(databaseVariables.map((variable) => variable.key));
    const detectedOnlyVariables = (selectedTemplateRecord.detectedKeys || [])
      .filter((key) => !matchedKeys.has(key) && !TEMPLATE_LOOP_HELPER_KEYS.has(key))
      .map((key) => ({
        key,
        label: key,
        source: 'detected' as const,
      }));

    return [...databaseVariables, ...detectedOnlyVariables];
  }, [selectedTemplateRecord]);

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

    return Object.fromEntries(
      templateVariables.map((variable) => {
        const draftValue = variableDrafts[variable.key] ?? (variable.id ? variableDrafts[variable.id] : undefined);
        const savedValue = variable.source === 'database' && variable.id ? companyVariableMap.get(variable.id) || '' : '';
        const autoValue = baseVariables[variable.key] || '';

        const finalValue = draftValue !== undefined && draftValue !== ''
          ? draftValue
          : savedValue !== ''
            ? savedValue
            : autoValue;

        return [variable.key, finalValue];
      })
    );
  }, [baseVariables, companyVariableMap, selectedTemplateRecord, templateVariables, variableDrafts]);

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
      return !effectiveValue.trim();
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

    await addTemplateVariableToManualAction(key, label, selectedCompanyRecord.id, value);
    // No alert — the badge will switch to "Manual" once context refreshes
  };

  const handleSave = async () => {
    if (!selectedCompanyRecord || !selectedTemplateRecord || !previewContent) return;
    if (missingTemplateVariables.length > 0) return;

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

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Inputs */}
          <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-5 max-h-[calc(100vh-6rem)] overflow-y-auto">
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
                          const isManual = !isAuto && variable.source === 'database' && id && !id.startsWith('loop-');
                          const isTemplateOnly = !isAuto && !isManual && variable.source === 'detected';

                          const savedValue = isManual && id
                            ? companyRecord.variableValues.find((entry) => entry.variableId === id)?.value || ''
                            : '';
                          const autoValue = baseVariables[key] || '';
                          const draftValue = variableDrafts[key] ?? (id ? variableDrafts[id] : undefined);
                          const currentValue = draftValue ?? (savedValue || autoValue);

                          const isEdited = draftValue !== undefined && draftValue !== (savedValue || autoValue);

                          return (
                            <div key={key} className="space-y-2 rounded-lg border border-border bg-input/30 p-4">
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
                                    className="shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs"
                                    onClick={() => addToManualVariables(key, variable.label)}
                                  >
                                    + Add as Manual
                                  </Button>
                                )}
                              </div>

                              {/* Input */}
                              <Input
                                value={currentValue}
                                onChange={(event) =>
                                  setVariableDrafts((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                    ...(id ? { [id]: event.target.value } : {}),
                                  }))
                                }
                                placeholder={`Enter value for ${variable.label}`}
                                className="bg-background text-sm"
                              />

                              {/* Status hint */}
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview and Actions */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Document Preview
              </h2>

              <div className="flex-1 bg-slate-900/40 border border-border rounded-lg p-6 overflow-y-auto mb-6 min-h-[450px]">
                {previewContent ? (
                  <div className="bg-white text-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-sm shadow-xl border border-slate-200 p-8 sm:p-12 mx-auto max-w-[850px] min-h-[650px] text-sm leading-relaxed whitespace-pre-wrap break-words font-sans selection:bg-blue-100">
                    {previewContent}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      Select a company and template to generate live document preview
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {previewContent && (
                <div className="flex gap-3">
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
