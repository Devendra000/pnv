'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { Company, CompanyObjectiveTemplate, Owner, Witness } from '@/lib/types';
import { Variable } from '@/lib/types';
import { useAppDataContext } from '@/contexts/AppDataContext';
import {
  buildCompanyRuntimeVariableValues,
  isRuntimeCompanyVariableKey,
} from '@/lib/companyVariables';
import { resolveFormulaVariables } from '@/lib/formulaEvaluator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, BadgeInfo, Building2, FileText, Lock, Plus, Trash2, Users, Search, Tag, Check, Filter } from 'lucide-react';
import Link from 'next/link';

interface CompanyFormProps {
  company?: Company;
  objectives: CompanyObjectiveTemplate[];
  variables: Variable[];
  onSubmit: (company: CompanyFormSubmission) => void;
}

type CompanyFormSubmission = {
  englishName: string;
  nepaliName: string | null;
  companyAddress: string | null;
  ownerType: 'SINGLE' | 'MULTIPLE';
  owners: Array<{
    name: string;
    fatherName: string | null;
    address: string | null;
    citizenship: string | null;
    jariJilla: string | null;
    citizenshipJariDate: string | null;
    phoneNumber: string | null;
    shares: string | null;
    order: number;
  }>;
  witnesses: Array<{
    name: string;
    address: string | null;
    citizenship: string | null;
    jariJilla: string | null;
    citizenshipJariDate: string | null;
    phoneNumber: string | null;
    ownerIndex: number | null; // 1-based index of the owner this witness belongs to; null = general
    order: number;
  }>;
  objectives: Array<{
    sourceObjectiveId: string | null;
    text: string;
    order: number;
  }>;
  variableValues: Array<{
    variableId: string;
    value: string;
  }>;
};

type PersonEditorProps = {
  label: string;
  person: Owner | Witness;
  onChange: (next: Owner | Witness) => void;
  onRemove?: () => void;
  removable?: boolean;
  isOwner?: boolean;
  showShares?: boolean;
  slot?: number;
  ownerRoles?: import('@/lib/types').OwnerRole[];
};

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm shadow-black/20 backdrop-blur">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function FieldLabel({ children, variableTag }: { children: ReactNode; variableTag?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{children}</label>
      {variableTag ? (
        <span className="font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 px-1.5 py-0.5 rounded shadow-sm">
          [{variableTag}]
        </span>
      ) : null}
    </div>
  );
}


function PersonEditor({
  label,
  person,
  onChange,
  onRemove,
  removable = false,
  isOwner = false,
  showShares = false,
  slot,
  ownerRoles = [],
}: PersonEditorProps) {
  const prefix = isOwner ? 'owner' : 'witness';
  const tagSuffix = slot ? `_${slot}` : '';

  const updateField = (field: keyof Owner | keyof Witness, value: string | number | null) => {
    onChange({
      ...person,
      [field]: value,
    } as Owner | Witness);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Fill the details that will appear in documents.</p>
        </div>
        {removable && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-full border border-rose-900/60 bg-rose-950/30 px-3 py-1.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-950/60"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <FieldLabel variableTag={`${prefix}_name${tagSuffix}`}>Name</FieldLabel>
          <Input
            value={person.name || ''}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Full name"
            className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
          />
        </div>
        {isOwner && (
          <div>
            <FieldLabel variableTag={`owner_role${tagSuffix}`}>Owner Type</FieldLabel>
            <select
              value={(person as Owner).ownerRoleId || ''}
              onChange={(event) => updateField('ownerRoleId', event.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Type (Optional)</option>
              {ownerRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {isOwner && (
          <div>
            <FieldLabel variableTag={`owner_father_name${tagSuffix}`}>Father&apos;s Name</FieldLabel>
            <Input
              value={(person as Owner).fatherName || ''}
              onChange={(event) => updateField('fatherName', event.target.value)}
              placeholder="Father's name"
              className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
            />
          </div>
        )}
        {isOwner && (
          <div>
            <FieldLabel variableTag={`${prefix}_citizenship_jari_date${tagSuffix}`}>
              Citizenship Issued Date (B.S.)
            </FieldLabel>
            <Input
              value={person.citizenshipJariDate || ''}
              onChange={(event) => updateField('citizenshipJariDate', event.target.value)}
              placeholder="e.g. 2080-01-01"
              className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
            />
          </div>
        )}
        <div>
          <FieldLabel variableTag={`${prefix}_phone_number${tagSuffix}`}>Phone Number</FieldLabel>
          <Input
            value={person.phoneNumber || ''}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
            placeholder="Phone number"
            className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
          />
        </div>
        <div className="lg:col-span-2">
          <FieldLabel variableTag={`${prefix}_address${tagSuffix}`}>Address</FieldLabel>
          <Input
            value={person.address || ''}
            onChange={(event) => updateField('address', event.target.value)}
            placeholder="Address"
            className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <FieldLabel variableTag={`${prefix}_citizenship${tagSuffix}`}>Citizenship No.</FieldLabel>
          <Input
            value={person.citizenship || ''}
            onChange={(event) => updateField('citizenship', event.target.value)}
            placeholder="Citizenship number"
            className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <FieldLabel variableTag={`${prefix}_jari_jilla${tagSuffix}`}>Jari Jilla</FieldLabel>
          <Input
            value={person.jariJilla || ''}
            onChange={(event) => updateField('jariJilla', event.target.value)}
            placeholder="Jari Jilla (Issuing District)"
            className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
          />
        </div>
        {showShares && (
          <div>
            <FieldLabel variableTag={`owner_shares${tagSuffix}`}>Share Sankhaya</FieldLabel>
            <Input
              value={(person as Owner).shares || ''}
              onChange={(event) => updateField('shares', event.target.value)}
              placeholder="Share Sankhaya"
              className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function CompanyForm({
  company,
  objectives,
  variables,
  onSubmit,
}: CompanyFormProps) {
  const createBlankOwner = (id: string, order: number): Owner => ({
    id,
    name: '',
    fatherName: '',
    address: '',
    citizenship: '',
    jariJilla: '',
    citizenshipJariDate: '',
    phoneNumber: '',
    shares: '',
    order,
  });

  const createBlankWitness = (id: string, order: number): Witness => ({
    id,
    name: '',
    address: '',
    citizenship: '',
    jariJilla: '',
    citizenshipJariDate: '',
    phoneNumber: '',
    ownerIndex: null,
    order,
  });

  const [formData, setFormData] = useState<{
    englishName: string;
    nepaliName: string;
    companyAddress: string;
    ownerType: 'SINGLE' | 'MULTIPLE';
  }>(() => ({
    englishName: company?.englishName || '',
    nepaliName: company?.nepaliName || '',
    companyAddress: company?.companyAddress || '',
    ownerType: company?.ownerType || 'SINGLE',
  }));

  const [owners, setOwners] = useState<Owner[]>(() => {
    if (company && company.owners.length > 0) {
      return company.owners;
    }

    return [createBlankOwner('own-0', 0)];
  });

  // Witnesses are kept 1-to-1 with owners; ownerIndex is auto-set (1-based)
  const [witnesses, setWitnesses] = useState<Witness[]>(() => {
    if (company && company.witnesses.length > 0) {
      // Pad / trim so there is exactly one witness per owner
      const ownerCount = company.owners.length > 0 ? company.owners.length : 1;
      const base = company.witnesses.slice(0, ownerCount);
      while (base.length < ownerCount) {
        const idx = base.length;
        base.push(createBlankWitness(`wit-${idx}`, idx));
      }
      return base.map((w, i) => ({ ...w, ownerIndex: i + 1 }));
    }
    return [{ ...createBlankWitness('wit-0', 0), ownerIndex: 1 }];
  });

  const { objectiveCategories = [], ownerRoles = [] } = useAppDataContext();
  const [activeCategoryId, setActiveCategoryId] = useState<string | 'ALL'>('ALL');
  const [objectiveSearchQuery, setObjectiveSearchQuery] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(() =>
    company?.objectives ? company.objectives.length > 0 : false
  );

  const [selectedObjectives, setSelectedObjectives] = useState<string[]>(() =>
    company?.objectives ? company.objectives.map((objective) => objective.sourceObjectiveId || '') : []
  );

  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    const initialValues = Object.fromEntries(
      variables.map((variable) => [variable.id, ''])
    ) as Record<string, string>;

    if (!company) {
      return initialValues;
    }

    return company.variableValues.reduce((accumulator, entry) => {
      accumulator[entry.variableId] = entry.value;
      return accumulator;
    }, initialValues);
  });

  // Pre-select 'अध्यक्ष' for the first owner if they are newly added and don't have a role yet
  useEffect(() => {
    if (!company && owners.length === 1 && !owners[0].ownerRoleId && ownerRoles.length > 0) {
      const adhakshyaRole = ownerRoles.find(r => r.name === 'अध्यक्ष');
      if (adhakshyaRole) {
        setOwners(current => {
          if (current.length === 1 && !current[0].ownerRoleId) {
            return [{ ...current[0], ownerRoleId: adhakshyaRole.id }];
          }
          return current;
        });
      }
    }
  }, [company, owners, ownerRoles]);

  // Helper: add a new witness for a new owner slot
  const addWitnessForOwner = (ownerIdx: number) =>
    setWitnesses((current) => [
      ...current,
      { ...createBlankWitness(`wit-${Date.now()}`, ownerIdx), ownerIndex: ownerIdx + 1 },
    ]);

  // Helper: remove the witness that belongs to a given owner index and re-number
  const removeWitnessForOwner = (ownerIdx: number) =>
    setWitnesses((current) =>
      current
        .filter((_, i) => i !== ownerIdx)
        .map((w, i) => ({ ...w, ownerIndex: i + 1, order: i }))
    );

  const setOwnerType = (ownerType: 'SINGLE' | 'MULTIPLE') => {
    setFormData((current) => ({ ...current, ownerType }));

    if (ownerType === 'SINGLE') {
      setOwners((current) => (current.length > 0 ? current.slice(0, 1) : [createBlankOwner('own-0', 0)]));
      setWitnesses((current) => {
        const first = current[0] ?? { ...createBlankWitness('wit-0', 0), ownerIndex: 1 };
        return [{ ...first, ownerIndex: 1 }];
      });
      return;
    }

    if (owners.length === 0) {
      setOwners([createBlankOwner('own-0', 0), createBlankOwner('own-1', 1)]);
      setWitnesses([
        { ...createBlankWitness('wit-0', 0), ownerIndex: 1 },
        { ...createBlankWitness('wit-1', 1), ownerIndex: 2 },
      ]);
    }
  };

  const baseRuntimeValues = buildCompanyRuntimeVariableValues({
    englishName: formData.englishName,
    nepaliName: formData.nepaliName,
    companyAddress: formData.companyAddress,
    ownerType: formData.ownerType,
    owners,
    witnesses,
    objectives: selectedObjectives.map((id) => ({ text: objectives.find((o) => o.id === id)?.text || '' })),
  });

  const formulaMap = new Map<string, string>();
  for (const v of variables) {
    if (v.formula) formulaMap.set(v.key, v.formula);
  }

  const dict: Record<string, string> = { ...baseRuntimeValues };
  for (const v of variables) {
    if (variableValues[v.id] && !v.formula) {
      dict[v.key] = variableValues[v.id];
    }
  }

  const formulaResults = resolveFormulaVariables(formulaMap, dict);
  const runtimeValues = { ...dict, ...formulaResults };

  const resolvedVariableValues = variables.map((variable) => ({
    variableId: variable.id,
    value: variableValues[variable.id] || runtimeValues[variable.key] || '',
  }));

  // Sync variables that correspond to company runtime keys so users are not asked for them
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedCompany = {
      englishName: formData.englishName,
      nepaliName: formData.nepaliName || null,
      companyAddress: formData.companyAddress || null,
      ownerType: formData.ownerType,
      owners: owners.map((o, idx) => ({
        name: o.name,
        fatherName: o.fatherName || null,
        address: o.address || null,
        citizenship: o.citizenship || null,
        jariJilla: o.jariJilla || null,
        citizenshipJariDate: o.citizenshipJariDate || null,
        phoneNumber: o.phoneNumber || null,
        shares: o.shares || null,
        order: idx,
      })),
      witnesses: witnesses.map((w, idx) => ({
        name: w.name,
        address: w.address || null,
        citizenship: w.citizenship || null,
        jariJilla: w.jariJilla || null,
        citizenshipJariDate: w.citizenshipJariDate || null,
        phoneNumber: w.phoneNumber || null,
        ownerIndex: w.ownerIndex ?? null,
        order: idx,
      })),
      objectives: selectedObjectives.map((objId, idx) => ({
        sourceObjectiveId: objId,
        text: objectives.find((o) => o.id === objId)?.text || '',
        order: idx,
      })),
      variableValues: resolvedVariableValues,
    };

    onSubmit(formattedCompany);
  };

  const totalVariableFields = variables.length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/companies">
          <Button variant="ghost" className="px-0 text-slate-500 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Button>
        </Link>
        <div className="hidden rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 shadow-sm sm:block">
          Separated company form
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard
            title="Company Detail"
            description="Keep the company identity fields grouped together for quick entry and easier review."
            icon={<Building2 className="h-5 w-5" />}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <FieldLabel variableTag="company_name">Company Name (English) *</FieldLabel>
                <Input
                  value={formData.englishName}
                  onChange={(event) => setFormData({ ...formData, englishName: event.target.value })}
                  required
                  placeholder="Company name in English"
                  className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <FieldLabel variableTag="company_nepali_name">Nepali Name</FieldLabel>
                <Input
                  value={formData.nepaliName || ''}
                  onChange={(e) => setFormData((current) => ({ ...current, nepaliName: e.target.value }))}
                  placeholder="e.g. एक्मे कर्प"
                  className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
                />
              </div>
              <div className="lg:col-span-2">
                <FieldLabel variableTag="company_address">Company Address</FieldLabel>
                <Input
                  value={formData.companyAddress || ''}
                  onChange={(e) => setFormData((current) => ({ ...current, companyAddress: e.target.value }))}
                  placeholder="e.g. Kathmandu, Nepal"
                  className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <FieldLabel variableTag="owner_type">Ownership Structure</FieldLabel>
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 p-2">
                  <button
                    type="button"
                    onClick={() => setOwnerType('SINGLE')}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${formData.ownerType === 'SINGLE'
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'
                      }`}
                  >
                    Single Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerType('MULTIPLE')}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${formData.ownerType === 'MULTIPLE'
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'
                      }`}
                  >
                    Multiple Owners
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Owners (Shareholders)"
            description="Enter the owner details in clearly separated blocks, matching the document placeholders. Each owner has one witness."
            icon={<Users className="h-5 w-5" />}
          >
            <div className="space-y-6">
              {owners.map((owner, index) => (
                <div key={owner.id} className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-800/10 p-1">
                  {/* Owner card */}
                  <div className="p-3">
                    <PersonEditor
                      label={`Owner ${index + 1}`}
                      person={owner}
                      onChange={(nextOwner) =>
                        setOwners((current) => current.map((item, itemIndex) => (itemIndex === index ? (nextOwner as Owner) : item)))
                      }
                      onRemove={
                        formData.ownerType === 'MULTIPLE' && owners.length > 1
                          ? () => {
                            setOwners((current) => current.filter((_, i) => i !== index));
                            removeWitnessForOwner(index);
                          }
                          : undefined
                      }
                      removable={formData.ownerType === 'MULTIPLE' && owners.length > 1}
                      isOwner={true}
                      showShares={true}
                      slot={index + 1}
                      ownerRoles={ownerRoles}
                    />
                  </div>

                  {/* Witness sub-form for this owner */}
                  <div className="mx-3 mb-3 rounded-xl border border-slate-700/40 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">{index + 1}</span>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Witness for Owner {index + 1}</p>
                    </div>
                    {witnesses[index] ? (
                      <PersonEditor
                        label={`Witness ${index + 1}`}
                        person={witnesses[index]}
                        onChange={(nextWitness) =>
                          setWitnesses((current) =>
                            current.map((item, i) => (i === index ? ({ ...nextWitness, ownerIndex: index + 1 } as Witness) : item))
                          )
                        }
                        removable={false}
                        isOwner={false}
                        slot={index + 1}
                      />
                    ) : null}
                  </div>
                </div>
              ))}

              {formData.ownerType === 'MULTIPLE' && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-slate-300 dark:border-slate-700 bg-transparent py-6 text-slate-700 dark:text-slate-300 hover:bg-slate-800/40"
                  onClick={() => {
                    const newIdx = owners.length;
                    setOwners((current) => [
                      ...current,
                      createBlankOwner(`own-${Date.now()}`, newIdx),
                    ]);
                    addWitnessForOwner(newIdx);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Owner
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Business Objectives"
            description="Select objectives categorized by government sectors for document generation."
            icon={<FileText className="h-5 w-5" />}
          >
            <div className="space-y-5">
              {/* Category Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search objectives or categories..."
                    value={objectiveSearchQuery}
                    onChange={(e) => setObjectiveSearchQuery(e.target.value)}
                    className="pl-10 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                  className={`border-slate-300 dark:border-slate-700 font-medium ${showSelectedOnly
                    ? 'bg-primary/20 text-primary border-primary/50'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800'
                    }`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {showSelectedOnly
                    ? `Showing Selected (${selectedObjectives.length})`
                    : `Show Selected Only (${selectedObjectives.length})`}
                </Button>
              </div>

              {/* Category Selection Grid / Pills */}
              {!showSelectedOnly && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Government Categories (Click to filter)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryId('ALL')}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${activeCategoryId === 'ALL'
                        ? 'border-primary bg-primary/20 text-slate-900 dark:text-white shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:border-slate-700 hover:bg-slate-800/40'
                        }`}
                    >
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">All Categories</span>
                      <div className="mt-1 flex items-center justify-between w-full text-[11px]">
                        <span>{objectives.length} objectives</span>
                        {selectedObjectives.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-primary/100/20 text-primary font-medium">
                            {selectedObjectives.length} selected
                          </span>
                        )}
                      </div>
                    </button>

                    {objectiveCategories.map((cat) => {
                      const catObjs = objectives.filter((o) => o.categoryId === cat.id);
                      const catSelectedCount = catObjs.filter((o) =>
                        selectedObjectives.includes(o.id)
                      ).length;
                      const isActive = activeCategoryId === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategoryId(cat.id)}
                          className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${isActive
                            ? 'border-primary bg-primary/20 text-slate-900 dark:text-white shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:border-slate-700 hover:bg-slate-800/40'
                            }`}
                        >
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate w-full">
                            {cat.name}
                          </span>
                          <div className="mt-1 flex items-center justify-between w-full text-[11px]">
                            <span>{catObjs.length} objectives</span>
                            {catSelectedCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-primary/100/20 text-primary font-medium">
                                {catSelectedCount} selected
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Objectives List under Active Category / Filter */}
              <div className="space-y-3 pt-2">
                {(() => {
                  const filteredList = objectives.filter((obj) => {
                    if (showSelectedOnly && !selectedObjectives.includes(obj.id)) {
                      return false;
                    }
                    const matchesCategory =
                      activeCategoryId === 'ALL' || obj.categoryId === activeCategoryId;
                    const matchesSearch =
                      !objectiveSearchQuery.trim() ||
                      obj.text.toLowerCase().includes(objectiveSearchQuery.toLowerCase()) ||
                      (obj.categoryName &&
                        obj.categoryName.toLowerCase().includes(objectiveSearchQuery.toLowerCase()));

                    return matchesCategory && matchesSearch;
                  });

                  if (filteredList.length === 0) {
                    return (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-900/30 p-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {showSelectedOnly
                            ? 'No objectives selected yet.'
                            : objectiveSearchQuery || activeCategoryId !== 'ALL'
                              ? 'No objectives found under this category or search query.'
                              : 'No objectives configured.'}
                        </p>
                      </div>
                    );
                  }

                  return filteredList.map((obj) => {
                    const isChecked = selectedObjectives.includes(obj.id);
                    return (
                      <label
                        key={obj.id}
                        className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${isChecked
                          ? 'border-primary/70 bg-primary/10 shadow-sm shadow-primary/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-800/50'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedObjectives([...selectedObjectives, obj.id]);
                            } else {
                              setSelectedObjectives(
                                selectedObjectives.filter((id) => id !== obj.id)
                              );
                            }
                          }}
                          className="mt-1 h-4 w-4 accent-primary rounded"
                        />
                        <div className="flex-1 space-y-1">
                          {obj.categoryName && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary uppercase tracking-wider">
                              <Tag className="h-3 w-3" />
                              {obj.categoryName}
                            </span>
                          )}
                          <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                            {obj.text}
                          </p>
                        </div>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Variable Values"
            description="Auto-mapped variables are filled automatically from the company record and cannot be edited here. Only manual variables require input."
            icon={<BadgeInfo className="h-5 w-5" />}
          >
            {variables.length > 0 ? (
              <div className="space-y-8">
                {/* ── Manual input ── */}
                {(() => {
                  const manualVars = variables.filter((v) => !isRuntimeCompanyVariableKey(v.key) && baseRuntimeValues[v.key] === undefined && !v.formula);
                  if (manualVars.length === 0) return null;

                  const grouped: Record<string, Variable[]> = {};
                  manualVars.forEach(v => {
                    const g = v.group || 'Other';
                    if (!grouped[g]) grouped[g] = [];
                    grouped[g].push(v);
                  });

                  return (
                    <div className="space-y-6">
                      {Object.entries(grouped).map(([groupName, groupVars]) => (
                        <div key={groupName} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5">
                          <div className="mb-5 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              {groupName === 'Other' ? 'Manual input required' : `Manual input — ${groupName}`}
                            </p>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            {groupVars.map((variable) => {
                              // Use 'text' even for numbers because HTML 'number' input strictly rejects commas and Nepali digits
                              const inputType = variable.type === 'date' ? 'date' : 'text';
                              const derivedValue = runtimeValues[variable.key] || '';
                              return (
                                <div key={variable.id} className={variable.type === 'list' ? 'lg:col-span-2' : ''}>
                                  <FieldLabel>{variable.label}</FieldLabel>
                                  {variable.type === 'list' ? (
                                    <textarea
                                      value={variableValues[variable.id] || derivedValue}
                                      onChange={(event) =>
                                        setVariableValues((current) => ({
                                          ...current,
                                          [variable.id]: event.target.value,
                                        }))
                                      }
                                      placeholder={`Enter ${variable.key}`}
                                      className="min-h-28 w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-500 outline-none transition-shadow focus:border-slate-500 focus:ring-2 focus:ring-slate-700"
                                    />
                                  ) : (
                                    <Input
                                      type={inputType}
                                      value={variableValues[variable.id] || derivedValue}
                                      onChange={(event) =>
                                        setVariableValues((current) => ({
                                          ...current,
                                          [variable.id]: event.target.value,
                                        }))
                                      }
                                      placeholder={`Enter ${variable.key}`}
                                      className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-500"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* ── Auto-mapped (read-only) ── */}
                {(() => {
                  const autoVars = variables.filter((v) => isRuntimeCompanyVariableKey(v.key) || baseRuntimeValues[v.key] !== undefined || !!v.formula);
                  if (autoVars.length === 0) return null;

                  const formulaVars = autoVars.filter(v => !!v.formula);
                  const standardAutoVars = autoVars.filter(v => !v.formula);

                  const renderAutoGroup = (groupTitle: string, groupVars: Variable[]) => {
                    if (groupVars.length === 0) return null;
                    return (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5">
                        <div className="mb-5 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <Lock className="h-3.5 w-3.5 text-slate-500" />
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{groupTitle} — read only</p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          {groupVars.map((variable) => {
                            const derivedValue = runtimeValues[variable.key] || '';
                            const isEmpty = !derivedValue;
                            const isMultiLine = variable.type === 'list' && derivedValue.includes('\n');
                            return (
                              <div key={variable.id} className={isMultiLine ? 'lg:col-span-2' : ''}>
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                  <label className="text-sm font-medium font-mono text-slate-700 dark:text-slate-300">{`[${variable.key}]`}</label>
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                                    <Lock className="h-2.5 w-2.5" />
                                    auto
                                  </span>
                                </div>
                                {isMultiLine ? (
                                  <pre className="min-h-20 w-full whitespace-pre-wrap rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300 select-all">
                                    {derivedValue}
                                  </pre>
                                ) : (
                                  <div className={`flex items-center rounded-xl border px-3 py-2.5 font-mono text-sm ${isEmpty
                                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/20 text-slate-600'
                                    : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300'
                                    }`}>
                                    {isEmpty ? <span className="italic">not set yet</span> : derivedValue}
                                  </div>
                                )}
                                {variable.formula && (
                                  <p className="mt-1.5 text-[11px] font-medium text-amber-600/80 dark:text-amber-500/80">
                                    ⚡ Formula: <code className="font-mono bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded text-[10px]">{variable.formula}</code>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800/60">
                      {renderAutoGroup("Auto-mapped", standardAutoVars)}
                      {renderAutoGroup("Formula", formulaVars)}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No variables configured yet.</p>
            )}
          </SectionCard>
        </div>

        <aside className="sticky top-6 self-start">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 text-slate-900 dark:text-white shadow-2xl shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Live summary</p>
            <h3 className="mt-2 text-2xl font-semibold">Ready to generate</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Keep the form sections separated so each document part can be scanned quickly before saving.
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-500 dark:text-slate-400">Company name</span>
                <span className="font-medium text-slate-900 dark:text-white">{formData.englishName || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-500 dark:text-slate-400">Owners</span>
                <span className="font-medium text-slate-900 dark:text-white">{owners.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-500 dark:text-slate-400">Witnesses</span>
                <span className="font-medium text-slate-900 dark:text-white">{witnesses.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-500 dark:text-slate-400">Selected objectives</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedObjectives.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-500 dark:text-slate-400">Variable fields</span>
                <span className="font-medium text-slate-900 dark:text-white">{totalVariableFields}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button className="h-12 bg-white text-slate-950 hover:bg-slate-100" type="submit">
                {company ? 'Update Company' : 'Create Company'}
              </Button>
              <Link href="/companies">
                <Button variant="outline" className="h-12 w-full border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white hover:bg-white/10">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
