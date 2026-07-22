'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, ChevronDown, ChevronUp, Search, Upload } from 'lucide-react';
import { extractDocxTemplateData, type ParsedTemplateData } from '@/lib/templateParser';

export default function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, loading, variables } =
    useAppDataContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileError, setFileError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<ParsedTemplateData | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
  });

  const editingTemplate = useMemo(
    () => templates.find((template) => template.id === editingId) || null,
    [templates, editingId]
  );

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewTemplate({ name: '' });
    setSelectedFile(null);
    setFilePreview(null);
    setFileError('');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setSelectedFile(null);
      setFilePreview(null);
      setFileError('Please upload a .docx file.');
      return;
    }

    try {
      const parsed = extractDocxTemplateData(await file.arrayBuffer(), variables);
      setSelectedFile(file);
      setFilePreview(parsed);
    } catch (error) {
      console.error('Failed to parse uploaded template:', error);
      setSelectedFile(null);
      setFilePreview(null);
      setFileError('Could not read that DOCX file. Please try another file.');
    }
  };

  const handleAdd = async () => {
    if (!newTemplate.name.trim() || !selectedFile) {
      return;
    }

    await addTemplate({
      name: newTemplate.name.trim(),
      file: selectedFile,
    });
    resetForm();
  };

  const handleUpdate = async (id: string) => {
    if (!newTemplate.name.trim()) {
      return;
    }

    await updateTemplate(id, {
      name: newTemplate.name.trim(),
      file: selectedFile,
    });
    resetForm();
  };

  const visiblePreview = filePreview || editingTemplate;
  const visibleMatchedVariables = visiblePreview?.matchedVariables || [];
  const visibleDetectedKeys = visiblePreview?.detectedKeys || [];

  const [showHelper, setShowHelper] = useState(false);
  const [helperKey, setHelperKey] = useState('');
  const [helperMode, setHelperMode] = useState<'single' | 'multiple'>('single');
  const [includeSN, setIncludeSN] = useState(true);
  const [generatedSnippet, setGeneratedSnippet] = useState('');

  useEffect(() => {
    if (!helperKey) return setGeneratedSnippet('');

    const pluralize = (word: string) => {
      const lower = word.toLowerCase();
      if (lower.endsWith('ch') || lower.endsWith('sh') || lower.endsWith('x') || lower.endsWith('z') || lower.endsWith('s')) {
        return word + 'es';
      }
      return word + 's';
    };

    const parts = helperKey.split('_');
    const prefix = parts[0] || helperKey;
    const listKey = `${pluralize(prefix)}_list`;

    if (helperMode === 'single') {
      setGeneratedSnippet(`{{${helperKey}}}`);
      return;
    }

    const snLine = includeSN ? 'SN: {{sn}}\n' : '';
    setGeneratedSnippet(`{{#${listKey}}}\n${snLine}Owner: {{${helperKey}}}\n{{/${listKey}}}`);
  }, [helperKey, helperMode, includeSN]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedSnippet);
      // small feedback
      // eslint-disable-next-line no-alert
      alert('Snippet copied to clipboard');
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Could not copy to clipboard');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Document Templates"
        description="Upload DOCX templates and inspect the variables found inside"
        actions={
          <>
            {!isAdding && !editingId && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setShowHelper(true)}
              className="ml-3 text-foreground"
            >
              Template Helper
            </Button>
          </>
        }
      />

      {showHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHelper(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 w-[520px] mx-4">
            <h3 className="text-lg font-semibold text-foreground">Template Helper</h3>
            <p className="text-sm text-slate-500 mt-1">Enter a variable key and whether it should be single or repeatable.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Variable key</label>
                <Input value={helperKey} onChange={(e) => setHelperKey(e.target.value.trim())} placeholder="e.g., owner_name" />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="mode" checked={helperMode === 'single'} onChange={() => setHelperMode('single')} />
                  <span className="text-sm">Single</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="mode" checked={helperMode === 'multiple'} onChange={() => setHelperMode('multiple')} />
                  <span className="text-sm">Repeatable (loop)</span>
                </label>
              </div>

              {helperMode === 'multiple' && (
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={includeSN} onChange={(e) => setIncludeSN(e.target.checked)} />
                  <span className="text-sm">Include SN line</span>
                </label>
              )}

              <div className="mt-2">
                <label className="block text-sm font-medium text-foreground mb-2">Generated snippet</label>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-3 font-mono text-sm whitespace-pre-wrap">{generatedSnippet || '—'}</div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Button onClick={copyToClipboard} className="bg-blue-600 hover:bg-blue-700 text-white">Copy</Button>
                <Button variant="outline" onClick={() => setShowHelper(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2">
          <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-slate-500 shadow-none focus-visible:ring-0"
          />
        </div>

        {(isAdding || editingId) && (
          <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingId ? 'Edit Template' : 'New Template'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload a `.docx` file that contains placeholders like <span className="font-mono">{'{{CompanyName}}'}</span>.
                </p>
              </div>

              
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-foreground transition-colors"
                aria-label="Cancel template editing"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Template Name *
                </label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Corporate Charter"
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Upload DOCX Template *
                </label>
                <label className="flex items-center gap-3 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-foreground">
                    {selectedFile ? selectedFile.name : 'Choose a .docx file'}
                  </span>
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {fileError && <p className="mt-2 text-sm text-red-500">{fileError}</p>}
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-foreground">Detected Variables</h4>
                  <span className="text-xs text-slate-500">
                    {visibleDetectedKeys.length} found
                  </span>
                </div>
                {visibleDetectedKeys.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {visibleDetectedKeys.map((key) => {
                      const matchedVariable = visibleMatchedVariables.find((variable) => variable.key === key);

                      return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-700 dark:text-blue-300"
                      >
                        <span className="font-mono">{'{{'}{key}{'}}'}</span>
                        <span>{matchedVariable?.label || 'Custom variable'}</span>
                      </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No variables were detected in this DOCX.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editingId) {
                      handleUpdate(editingId);
                    } else {
                      handleAdd();
                    }
                  }}
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={!newTemplate.name.trim() || (!selectedFile && !editingId)}
                >
                  {editingId ? 'Update' : 'Create'} Template
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <p className="text-slate-500">
                {searchQuery
                  ? 'No templates found matching your search'
                  : 'No templates yet. Upload one to get started!'}
              </p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">File: {template.fileUrl}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {expandedId === template.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </div>

                {expandedId === template.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-500">Variables found in this template:</p>
                      {template.matchedVariables.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {template.matchedVariables.map((variable) => (
                            <span
                              key={variable.id}
                              className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-700 dark:text-blue-300"
                            >
                              <span className="font-mono">{'{{'}{variable.key}{'}}'}</span>
                              <span>{variable.label}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No matched variables found.</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          setEditingId(template.id);
                          setNewTemplate({ name: template.name });
                          setSelectedFile(null);
                          setFilePreview(null);
                          setFileError('');
                          setExpandedId(null);
                          setIsAdding(false);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
