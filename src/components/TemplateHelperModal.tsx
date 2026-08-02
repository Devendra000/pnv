'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Variable } from '@/lib/types';
import { COMPANY_VARIABLE_DEFINITIONS } from '@/lib/companyVariables';
import { Copy, Check, Repeat2, X, Search, Table, AlignLeft, Info, Sparkles } from 'lucide-react';

interface TemplateHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  variables?: Variable[];
}

// Field definitions for [#owners_list]
const OWNER_LOOP_FIELDS = [
  { key: 'sn', label: 'S.N.', category: 'owner', defaultChecked: true },
  { key: 'owner_name', label: 'Owner Name', category: 'owner', defaultChecked: true },
  { key: 'owner_father_name', label: "Father's Name", category: 'owner', defaultChecked: true },
  { key: 'owner_address', label: 'Address', category: 'owner', defaultChecked: true },
  { key: 'owner_citizenship', label: 'Citizenship No.', category: 'owner', defaultChecked: true },
  { key: 'owner_jari_jilla', label: 'Jari Jilla', category: 'owner', defaultChecked: true },
  { key: 'owner_citizenship_jari_date', label: 'Citizenship Issued Date (B.S.)', category: 'owner', defaultChecked: true },
  { key: 'owner_phone_number', label: 'Phone Number', category: 'owner', defaultChecked: false },
  { key: 'owner_shares', label: 'Share Sankhaya', category: 'owner', defaultChecked: false },
  
  // Assigned Witness fields inside owner loop
  { key: 'owner_witness_name', label: 'Witness Name', category: 'witness', defaultChecked: true },
  { key: 'owner_witness_address', label: 'Witness Address', category: 'witness', defaultChecked: false },
  { key: 'owner_witness_citizenship', label: 'Witness Citizenship No.', category: 'witness', defaultChecked: true },
  { key: 'owner_witness_jari_jilla', label: 'Witness Jari Jilla', category: 'witness', defaultChecked: true },
  { key: 'owner_witness_citizenship_jari_date', label: 'Witness Issued Date (B.S.)', category: 'witness', defaultChecked: true },
  { key: 'owner_witness_phone_number', label: 'Witness Phone Number', category: 'witness', defaultChecked: false },
];

// Field definitions for [#witnesses_list]
const WITNESS_LOOP_FIELDS = [
  { key: 'sn', label: 'S.N.', category: 'witness', defaultChecked: true },
  { key: 'witness_name', label: 'Witness Name', category: 'witness', defaultChecked: true },
  { key: 'witness_address', label: 'Witness Address', category: 'witness', defaultChecked: true },
  { key: 'witness_citizenship', label: 'Witness Citizenship No.', category: 'witness', defaultChecked: true },
  { key: 'witness_jari_jilla', label: 'Witness Jari Jilla', category: 'witness', defaultChecked: true },
  { key: 'witness_citizenship_jari_date', label: 'Witness Issued Date (B.S.)', category: 'witness', defaultChecked: true },
  { key: 'witness_phone_number', label: 'Witness Phone Number', category: 'witness', defaultChecked: false },
];

export function TemplateHelperModal({ isOpen, onClose, variables = [] }: TemplateHelperModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'loop'>('single');
  
  // Loop state
  const [loopType, setLoopType] = useState<'owners_list' | 'witnesses_list'>('owners_list');
  const [layoutStyle, setLayoutStyle] = useState<'table' | 'block'>('table');
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    OWNER_LOOP_FIELDS.forEach((f) => {
      initial[f.key] = f.defaultChecked;
    });
    return initial;
  });

  // Search filter for single variables
  const [singleSearch, setSingleSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentFields = loopType === 'owners_list' ? OWNER_LOOP_FIELDS : WITNESS_LOOP_FIELDS;

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectAllFields = (val: boolean) => {
    const next: Record<string, boolean> = {};
    currentFields.forEach((f) => {
      next[f.key] = val;
    });
    setSelectedFields(next);
  };

  // Generate loop snippet
  const generatedLoopSnippet = useMemo(() => {
    const active = currentFields.filter((f) => selectedFields[f.key]);

    if (active.length === 0) {
      return `[#${loopType}]\n  (Select at least one field above)\n[/${loopType}]`;
    }

    if (layoutStyle === 'table') {
      // Table Row representation
      const cells = active.map((f, idx) => {
        if (idx === 0) return `[#${loopType}][${f.key}]`;
        if (idx === active.length - 1) return `[${f.key}][/${loopType}]`;
        return `[${f.key}]`;
      });
      return `Word Table Row Cells:\n| ${cells.join(' | ')} |`;
    } else {
      // Block format
      const lines = active.map((f) => `  ${f.label}: [${f.key}]`);
      return `[#${loopType}]\n${lines.join('\n')}\n[/${loopType}]`;
    }
  }, [loopType, layoutStyle, selectedFields, currentFields]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(identifier);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Filter single variables
  const allSingleVars = [
    ...COMPANY_VARIABLE_DEFINITIONS.map((def) => ({
      key: def.key,
      label: def.label,
      description: def.description,
      isAuto: true,
    })),
    ...variables
      .filter((v) => !COMPANY_VARIABLE_DEFINITIONS.some((d) => d.key === v.key))
      .map((v) => ({
        key: v.key,
        label: v.label,
        description: 'Custom manual variable',
        isAuto: false,
      })),
  ];

  const filteredSingleVars = allSingleVars.filter(
    (v) =>
      v.key.toLowerCase().includes(singleSearch.toLowerCase()) ||
      v.label.toLowerCase().includes(singleSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-2xl shadow-black/80 overflow-hidden z-10">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">DOCX Template Helper</h2>
              <p className="text-xs text-slate-400">Copy loop tags and variable placeholders for your Word templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Search className="h-4 w-4" />
            Single Variable Tags
          </button>
          <button
            onClick={() => setActiveTab('loop')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'loop'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Repeat2 className="h-4 w-4" />
            Loop Blocks (Owners & Witnesses)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'single' ? (
            /* Single Variable Tags */
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  value={singleSearch}
                  onChange={(e) => setSingleSearch(e.target.value)}
                  placeholder="Search single variable tags..."
                  className="pl-9 border-slate-800 bg-slate-950 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredSingleVars.map((v) => {
                  const tag = `[${v.key}]`;
                  const isCopied = copiedKey === v.key;

                  return (
                    <div
                      key={v.key}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                            {tag}
                          </code>
                          <span className="text-xs font-medium text-white">{v.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 truncate">{v.description}</p>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(tag, v.key)}
                        className="h-8 gap-1 text-slate-300 hover:bg-slate-800 hover:text-white px-2.5 text-xs shrink-0"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Loop Target & Layout Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    1. Select Loop List
                  </label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLoopType('owners_list');
                        const next: Record<string, boolean> = {};
                        OWNER_LOOP_FIELDS.forEach((f) => (next[f.key] = f.defaultChecked));
                        setSelectedFields(next);
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        loopType === 'owners_list'
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      [#owners_list]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoopType('witnesses_list');
                        const next: Record<string, boolean> = {};
                        WITNESS_LOOP_FIELDS.forEach((f) => (next[f.key] = f.defaultChecked));
                        setSelectedFields(next);
                      }}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        loopType === 'witnesses_list'
                          ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      [#witnesses_list]
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    2. Select Layout Format
                  </label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1.5">
                    <button
                      type="button"
                      onClick={() => setLayoutStyle('table')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        layoutStyle === 'table'
                          ? 'bg-slate-100 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Table className="h-3.5 w-3.5" />
                      Table Row
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutStyle('block')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        layoutStyle === 'block'
                          ? 'bg-slate-100 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <AlignLeft className="h-3.5 w-3.5" />
                      Paragraph Block
                    </button>
                  </div>
                </div>
              </div>

              {/* Field Selectors */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    3. Fields to Include inside Loop
                  </label>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => selectAllFields(true)}
                      className="text-emerald-400 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllFields(false)}
                      className="text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Owner Fields */}
                  <div>
                    <span className="mb-2 block text-xs font-semibold text-emerald-400">
                      {loopType === 'owners_list' ? 'Owner Fields:' : 'Witness Fields:'}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {currentFields
                        .filter((f) => f.category === (loopType === 'owners_list' ? 'owner' : 'witness'))
                        .map((f) => (
                          <label
                            key={f.key}
                            className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-all ${
                              selectedFields[f.key]
                                ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200'
                                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedFields[f.key]}
                              onChange={() => toggleField(f.key)}
                              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block truncate font-semibold">{f.label}</span>
                              <span className="block truncate font-mono text-[10px] opacity-60">[{f.key}]</span>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Assigned Witness fields inside owners_list */}
                  {loopType === 'owners_list' && (
                    <div>
                      <span className="mb-2 block text-xs font-semibold text-violet-400">
                        Assigned Witness Fields (linked to owner):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {currentFields
                          .filter((f) => f.category === 'witness')
                          .map((f) => (
                            <label
                              key={f.key}
                              className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-all ${
                                selectedFields[f.key]
                                  ? 'border-violet-500/50 bg-violet-950/30 text-violet-200'
                                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={!!selectedFields[f.key]}
                                onChange={() => toggleField(f.key)}
                                className="rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-violet-500"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="block truncate font-semibold">{f.label}</span>
                                <span className="block truncate font-mono text-[10px] opacity-60">[{f.key}]</span>
                              </div>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview Box */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Generated DOCX Loop Snippet
                  </label>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(generatedLoopSnippet, 'loop_snippet')}
                    className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 text-xs"
                  >
                    {copiedKey === 'loop_snippet' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Snippet
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 shadow-inner overflow-x-auto whitespace-pre-wrap">
                  {generatedLoopSnippet}
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="rounded-2xl border border-blue-900/50 bg-blue-950/30 p-4 text-xs text-blue-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-blue-200">
                  <Info className="h-4 w-4 shrink-0 text-blue-400" />
                  How to use in Word (.docx):
                </div>
                <p>
                  • <strong>Table Layout:</strong> Put <code className="text-emerald-300">[{`#${loopType}`}]</code> at the start of your first table column, and <code className="text-emerald-300">[{`/${loopType}`}]</code> at the end of your last table column. Word will automatically duplicate the table row for each owner!
                </p>
                <p>
                  • <strong>Paragraph Layout:</strong> Simply paste the text block directly into your document where you want repeating details.
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 bg-slate-900/80 px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Done
          </Button>
        </div>

      </div>
    </div>
  );
}
