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
  TEMPLATE_LOOP_HELPER_KEYS,
} from '@/lib/companyVariables';

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
    if (!selectedCompanyRecord || !selectedTemplateRecord) {
      alert('Please select both a company and template');
    }
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

  const resolvedTemplateVariables = useMemo(() => {
    if (!selectedTemplateRecord) {
      return {} as Record<string, string>;
    }

    return Object.fromEntries(
      templateVariables.map((variable) => {
        const draftValue = variable.source === 'database' ? variableDrafts[variable.id || ''] ?? '' : variableDrafts[variable.key] ?? '';
        const savedValue = variable.source === 'database' && variable.id ? companyVariableMap.get(variable.id) || '' : '';
        return [variable.key, draftValue.trim() ? draftValue : savedValue];
      })
    );
  }, [companyVariableMap, selectedTemplateRecord, templateVariables, variableDrafts]);

  const previewContent = useMemo(() => {
    if (!selectedTemplateRecord) {
      return '';
    }

    const mergedVariables: Record<string, string> = { ...baseVariables, ...resolvedTemplateVariables };

    return renderPreviewTemplate(selectedTemplateRecord.content, mergedVariables, templateData);
  }, [baseVariables, resolvedTemplateVariables, selectedTemplateRecord, templateData]);

  const canShowTemplateVariables = Boolean(selectedCompanyRecord && selectedTemplateRecord);

  const missingTemplateVariables = useMemo(() => {
    if (!selectedTemplateRecord) {
      return [] as { id: string; key: string; label: string }[];
    }

    return templateVariables.filter((variable) => {
      const draftValue = variable.source === 'database' ? variableDrafts[variable.id || ''] ?? '' : variableDrafts[variable.key] ?? '';
      const savedValue = variable.source === 'database' && variable.id ? companyVariableMap.get(variable.id) || '' : '';
      return !(draftValue.trim() || savedValue.trim());
    });
  }, [companyVariableMap, selectedTemplateRecord, templateVariables, variableDrafts]);

  const saveVariableValue = async (variableId: string) => {
    if (!selectedCompanyRecord || !selectedTemplateRecord) {
      return;
    }

    const variable = templateVariables.find((entry) => entry.id === variableId);
    if (!variable) {
      return;
    }

    const value = variableDrafts[variableId] || '';
    if (!value.trim()) {
      alert(`Enter a value for ${variable.label} before saving.`);
      return;
    }

    await saveCompanyVariableValues(selectedCompanyRecord.id, [{ variableId, value }]);
  };

  const handleSave = async () => {
    if (!selectedCompanyRecord || !selectedTemplateRecord || !previewContent) {
      alert('Please select a company and template, then fill the variable values first.');
      return;
    }

    if (missingTemplateVariables.length > 0) {
      alert(`Fill all template variables before generating: ${missingTemplateVariables.map((variable) => variable.label).join(', ')}`);
      return;
    }

    await saveCompanyVariableValues(
      selectedCompanyRecord.id,
      templateVariables
        .filter((variable): variable is TemplateVariableItem & { id: string } => variable.source === 'database' && Boolean(variable.id))
        .map((variable) => ({
        variableId: variable.id,
          value: variableDrafts[variable.id] || '',
        }))
    );

    await addDocument({
      companyId: selectedCompanyRecord.id,
      companyName: selectedCompanyRecord.englishName,
      templateId: selectedTemplateRecord.id,
      templateName: selectedTemplateRecord.name,
      content: previewContent,
      variables: { ...baseVariables, ...resolvedTemplateVariables },
      templateData: templateData || undefined,
    });

    alert('Document saved successfully!');
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
                          <p className="text-muted-foreground mb-1">Registration Date</p>
                          <p className="text-foreground font-medium">
                            {selectedCompanyRecord.registrationDate
                              ? new Date(selectedCompanyRecord.registrationDate).toLocaleDateString()
                              : 'N/A'}
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

                  {canShowTemplateVariables && (
                    <div className="mt-6 mb-6 pt-6 border-t border-border space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-foreground">Template Variables</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-foreground hover:bg-muted"
                          onClick={async () => {
                            if (!selectedCompanyRecord || !selectedTemplateRecord) return;

                            const values = selectedTemplateRecord.matchedVariables.map((variable) => ({
                              variableId: variable.id,
                              value: variableDrafts[variable.id] || '',
                            }));

                            await saveCompanyVariableValues(selectedCompanyRecord.id, values);
                          }}
                        >
                          Save All Values
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {templateVariables.map((variable) => {
                          const companyRecord = selectedCompanyRecord;
                          if (!companyRecord) {
                            return null;
                          }

                          const savedValue = variable.source === 'database' && variable.id
                            ? companyRecord.variableValues.find((entry) => entry.variableId === variable.id)?.value || ''
                            : '';
                          const draftKey = variable.source === 'database' && variable.id ? variable.id : variable.key;
                          const currentValue = variableDrafts[draftKey] ?? savedValue;

                          return (
                            <div key={draftKey} className="space-y-2 rounded-lg border border-border bg-input/30 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-foreground">{variable.label}</p>
                                  <p className="text-xs font-mono text-muted-foreground">{`{{${variable.key}}}`}</p>
                                  {variable.source === 'detected' && (
                                    <p className="text-xs text-amber-500">Not in database yet, but detected in template.</p>
                                  )}
                                </div>
                                {variable.source === 'database' && variable.id ? (
                                  (() => {
                                    const databaseVariableId = variable.id;

                                    return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-border text-foreground hover:bg-muted"
                                    onClick={() => saveVariableValue(databaseVariableId)}
                                  >
                                    Save
                                  </Button>
                                    );
                                  })()
                                ) : (
                                  <span className="text-xs text-amber-500">Template-only variable</span>
                                )}
                              </div>
                              <Input
                                value={currentValue}
                                onChange={(event) =>
                                  setVariableDrafts((prev) => ({
                                    ...prev,
                                    [draftKey]: event.target.value,
                                  }))
                                }
                                placeholder={`Enter value for ${variable.label}`}
                                className="bg-background"
                              />
                              <div className="text-xs text-muted-foreground">
                                {savedValue ? 'Saved in company variables.' : 'No saved value yet.'}
                              </div>
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

              <div className="flex-1 bg-input/50 border border-border rounded-lg p-5 overflow-y-auto mb-6 min-h-[350px]">
                {previewContent ? (
                  <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {previewContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      Select a company and template, then click
                      <br />
                      <span className="font-semibold">&quot;Generate Document&quot;</span> to preview
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
