'use client';

import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Variable } from '@/lib/types';
import { isSystemVariableKey, COMPANY_VARIABLE_DEFINITIONS } from '@/lib/companyVariables';
import { useState, useMemo } from 'react';
import { Plus, X, Search, Lock, Repeat2, Copy, Check, Zap } from 'lucide-react';

// ── Loop field definitions ────────────────────────────────────────────────────
// These keys work ONLY inside their respective loop blocks in the .docx template.
// They are NOT stored in the DB — they're resolved at template-generation time.

const OWNERS_LOOP_FIELDS = [
  { key: 'sn',                                  description: 'Row number (1, 2, 3 …)' },
  { key: 'owner_name',                          description: "Owner's full name" },
  { key: 'owner_father_name',                   description: "Owner's father's name" },
  { key: 'owner_address',                       description: "Owner's address" },
  { key: 'owner_citizenship',                   description: "Owner's citizenship number" },
  { key: 'owner_jari_jilla',                    description: "Owner's citizenship issuing district" },
  { key: 'owner_citizenship_jari_date',         description: "Owner's citizenship issued date" },
  { key: 'owner_phone_number',                  description: "Owner's phone number" },
  { key: 'owner_shares',                        description: "Owner's share amount" },
  { key: 'owner_role',                          description: "Owner's type/role (e.g. Adhakshya)" },
  { key: 'owner_witness_name',                  description: "Name of the witness assigned directly to this owner" },
  { key: 'owner_witness_address',               description: "Address of the witness assigned directly to this owner" },
  { key: 'owner_witness_citizenship',           description: "Citizenship number of the witness assigned directly to this owner" },
  { key: 'owner_witness_jari_jilla',            description: "Citizenship issuing district of the witness assigned directly to this owner" },
  { key: 'owner_witness_citizenship_jari_date',  description: "Citizenship issued date of the witness assigned directly to this owner" },
  { key: 'owner_witness_phone_number',          description: "Phone number of the witness assigned directly to this owner" },
];

const WITNESSES_LOOP_FIELDS = [
  { key: 'sn',                            description: 'Row number (1, 2, 3 …)' },
  { key: 'witness_name',                  description: "Witness's full name" },
  { key: 'witness_address',               description: "Witness's address" },
  { key: 'witness_citizenship',           description: "Witness's citizenship number" },
  { key: 'witness_jari_jilla',            description: "Witness's citizenship issuing district" },
  { key: 'witness_citizenship_jari_date',   description: "Witness's citizenship issued date" },
  { key: 'witness_phone_number',           description: "Witness's phone number" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function VariablesPage() {
  const { variables, addVariable, updateVariable, deleteVariable, loading } =
    useAppDataContext();

  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newVariable, setNewVariable] = useState<{
    key: string;
    label: string;
    description: string;
    formula: string;
    type: Variable['type'];
  }>({ key: '', label: '', description: '', formula: '', type: 'text' });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(identifier);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const query = searchQuery.toLowerCase().trim();

  // Manual / Custom variables (excludes all system/auto variables)
  const filteredManualVariables = useMemo(() => {
    return variables.filter((v) => {
      if (isSystemVariableKey(v.key)) return false;
      if (!query) return true;
      return (
        v.key.toLowerCase().includes(query) ||
        v.label.toLowerCase().includes(query)
      );
    });
  }, [variables, query]);

  // Auto-mapped flat variables
  const filteredAutoDefinitions = useMemo(() => {
    if (!query) return COMPANY_VARIABLE_DEFINITIONS;
    return COMPANY_VARIABLE_DEFINITIONS.filter(
      (def) =>
        def.key.toLowerCase().includes(query) ||
        def.label.toLowerCase().includes(query) ||
        ('description' in def && (def.description as string).toLowerCase().includes(query))
    );
  }, [query]);

  // Owners loop fields
  const filteredOwnersLoop = useMemo(() => {
    if (!query) return OWNERS_LOOP_FIELDS;
    return OWNERS_LOOP_FIELDS.filter(
      (f) => f.key.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)
    );
  }, [query]);

  // Witnesses loop fields
  const filteredWitnessesLoop = useMemo(() => {
    if (!query) return WITNESSES_LOOP_FIELDS;
    return WITNESSES_LOOP_FIELDS.filter(
      (f) => f.key.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)
    );
  }, [query]);

  const validateFormula = (formula: string): boolean => {
    if (!formula.trim()) return true;
    const regex = /\[(.*?)\]/g;
    let match;
    const invalidKeys: string[] = [];
    while ((match = regex.exec(formula)) !== null) {
      const key = match[1];
      const isSystem = COMPANY_VARIABLE_DEFINITIONS.some(def => def.key === key) || isSystemVariableKey(key);
      const isCustom = variables.some(v => v.key === key);
      const isLoopField = OWNERS_LOOP_FIELDS.some(f => f.key === key) || WITNESSES_LOOP_FIELDS.some(f => f.key === key);
      
      if (!isSystem && !isCustom && !isLoopField) {
        invalidKeys.push(key);
      }
    }
    
    if (invalidKeys.length > 0) {
      alert(`Invalid variable(s) in formula: ${invalidKeys.map(k => `[${k}]`).join(', ')}.\nPlease make sure these variables exist.`);
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    if (newVariable.key.trim() && newVariable.label.trim()) {
      if (!validateFormula(newVariable.formula)) return;
      addVariable({
        key: newVariable.key.trim(),
        label: newVariable.label.trim(),
        description: newVariable.description.trim() || undefined,
        formula: newVariable.formula.trim() || undefined,
        type: newVariable.type,
      });
      setNewVariable({ key: '', label: '', description: '', formula: '', type: 'text' });
      setIsAdding(false);
    }
  };

  const handleUpdate = (id: string) => {
    if (newVariable.key.trim() && newVariable.label.trim()) {
      if (!validateFormula(newVariable.formula)) return;
      updateVariable(id, {
        key: newVariable.key.trim(),
        label: newVariable.label.trim(),
        description: newVariable.description.trim() || undefined,
        formula: newVariable.formula.trim() || undefined,
        type: newVariable.type,
      });
      setEditingId(null);
      setNewVariable({ key: '', label: '', description: '', formula: '', type: 'text' });
    }
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewVariable({ key: '', label: '', description: '', formula: '', type: 'text' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Template Variables"
        description="Reference guide for all available template keys and how to use them"
        actions={
          activeTab === 'manual' && !isAdding && !editingId && (
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Variable
            </Button>
          )
        }
      />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Search Bar & Tab Navigation */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2">
            <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search variables across keys, labels & descriptions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-slate-500 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'manual'
                  ? 'border-primary text-primary dark:text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Manual Variables
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                {filteredManualVariables.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('auto')}
              className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'auto'
                  ? 'border-primary text-primary dark:text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Auto & Loop Variables
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                {filteredAutoDefinitions.length + filteredOwnersLoop.length + filteredWitnessesLoop.length}
              </span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: MANUAL (CUSTOM) VARIABLES ── */}
        {activeTab === 'manual' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Custom Variables</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Variables you create manually. Use them in templates with <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{`[key]`}</code>.
              </p>
            </div>

            {/* Add / Edit form */}
            {(isAdding || editingId) && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingId ? 'Edit Variable' : 'New Variable'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Variable Key <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newVariable.key}
                      onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
                      placeholder="e.g., fiscal_year, ward_number"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Label <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newVariable.label}
                      onChange={(e) => setNewVariable({ ...newVariable, label: e.target.value })}
                      placeholder="Human-readable name shown in the form"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <Input
                      value={newVariable.description}
                      onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                      placeholder="Explain what this variable is used for"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                    <select
                      value={newVariable.type}
                      onChange={(e) => setNewVariable({ ...newVariable, type: e.target.value as Variable['type'] })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="list">List</option>
                    </select>
                  </div>

                  {/* Formula */}
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                      <Zap className="w-4 h-4" />
                      Formula <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <Input
                      value={newVariable.formula}
                      onChange={(e) => setNewVariable({ ...newVariable, formula: e.target.value })}
                      placeholder={`e.g.  TODAY  or  [adhikrit_puji] / 100  or  [var_a] - [var_b]`}
                      className="bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700/60 text-foreground font-mono text-sm"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Evaluated at generation time when no per-company value is set.{' '}
                      <strong>Supported:</strong>{' '}
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">TODAY</code>{' '}
                      · arithmetic <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">+ - * /</code>{' '}
                      · variable references <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">[key]</code>{' '}
                      · string literals <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">&quot;text&quot;</code>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                      className="bg-primary hover:bg-primary/90 text-white font-medium"
                    >
                      {editingId ? 'Update' : 'Create'} Variable
                    </Button>
                    <Button variant="outline" onClick={cancelForm}
                      className="border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* List */}
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading…</div>
              ) : filteredManualVariables.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
                  <p className="text-slate-500">
                    {searchQuery ? 'No custom variables match your search.' : 'No custom variables yet. Create one above.'}
                  </p>
                </div>
              ) : (
                filteredManualVariables.map((variable) => (
                  <div key={variable.id}
                    className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-sm font-mono font-semibold text-primary dark:text-primary">{`[${variable.key}]`}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-primary"
                          onClick={() => copyToClipboard(`[${variable.key}]`, variable.key)}
                        >
                          {copiedKey === variable.key ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <span className="rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          {variable.type}
                        </span>
                        {variable.formula && (
                          <span
                            title={`Formula: ${variable.formula}`}
                            className="flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                          >
                            <Zap className="h-3 w-3" />
                            Formula
                          </span>
                        )}
                      </div>
                      {variable.label && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {variable.label}
                          {variable.description && <span className="ml-2 text-slate-400">({variable.description})</span>}
                        </p>
                      )}
                      {variable.formula && (
                        <p className="mt-0.5 text-[11px] font-mono text-amber-600 dark:text-amber-400 truncate">
                          ⚡ {variable.formula}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-white"
                        onClick={() => {
                          setEditingId(variable.id);
                          setNewVariable({
                            key: variable.key,
                            label: variable.label,
                            description: variable.description || '',
                            formula: variable.formula || '',
                            type: variable.type,
                          });
                          setIsAdding(false);
                        }}
                      >Edit</Button>
                      <Button size="sm" variant="outline"
                        className="border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this variable?')) {
                            deleteVariable(variable.id);
                          }
                        }}
                      ><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── TAB 2: AUTO & LOOP VARIABLES ── */}
        {activeTab === 'auto' && (
          <div className="space-y-12">
            {/* ── Auto-mapped flat variables ── */}
            <section>
              <div className="mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <h2 className="text-base font-semibold text-foreground">Auto-mapped Variables</h2>
              </div>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Filled automatically from the company record. Use anywhere in the template — no loop needed.
              </p>
              {filteredAutoDefinitions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-500">
                  No auto-mapped variables match &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAutoDefinitions.map((def) => (
                    <div key={def.key}
                      className="flex items-start gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <code className="text-sm font-mono font-semibold text-primary dark:text-primary">{`[${def.key}]`}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-primary"
                          onClick={() => copyToClipboard(`[${def.key}]`, def.key)}
                        >
                          {copiedKey === def.key ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{def.label}</span>
                        {'description' in def && (
                          <span className="ml-2 text-xs text-slate-400">{(def as { description?: string }).description}</span>
                        )}
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        <Lock className="h-2.5 w-2.5" />auto
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Loop: owners_list ── */}
            <section>
              <div className="mb-1 flex items-center gap-2">
                <Repeat2 className="w-4 h-4 text-emerald-500" />
                <h2 className="text-base font-semibold text-foreground">Loop — <code className="text-emerald-600 dark:text-emerald-400">{'[#owners_list]'}</code></h2>
              </div>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Repeats once per owner. Wrap a table row or paragraph block with the loop tags, then use the fields below inside it.
              </p>
              <div className="mb-4 rounded-lg bg-slate-950 px-4 py-3 text-xs font-mono text-slate-300 overflow-x-auto">
                <span className="text-emerald-400">{'[#owners_list]'}</span>{'  '}
                <span className="text-yellow-300">{'[owner_name]'}</span>{'  '}
                <span className="text-yellow-300">{'[owner_father_name]'}</span>{'  '}
                <span className="text-yellow-300">{'[owner_citizenship]'}</span>{'  '}
                <span className="text-emerald-400">{'[/owners_list]'}</span>
              </div>
              {filteredOwnersLoop.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center text-slate-500">
                  No owner loop fields match &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60 text-left">
                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-56">Field</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredOwnersLoop.map((f) => (
                        <tr key={f.key} className="bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <code className="text-xs font-mono font-semibold text-yellow-600 dark:text-yellow-400">{`[${f.key}]`}</code>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>


          </div>
        )}

      </div>
    </div>
  );
}
