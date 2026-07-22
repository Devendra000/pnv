'use client';

import { useState, type ReactNode } from 'react';
import { Company, CompanyObjectiveTemplate, Owner, Witness } from '@/lib/types';
import { Variable } from '@/lib/types';
import {
  buildCompanyRuntimeVariableValues,
} from '@/lib/companyVariables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, BadgeInfo, Building2, FileText, Plus, Trash2, UserRound, Users } from 'lucide-react';
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
  ownerType: 'SINGLE' | 'MULTIPLE';
  registrationDate: string | null;
  owners: Array<{
    name: string;
    fatherName: string | null;
    address: string | null;
    citizenship: string | null;
    jariJilla: string | null;
    shares: string | null;
    sharePercentage: number | null;
    order: number;
  }>;
  witnesses: Array<{
    name: string;
    fatherName: string | null;
    address: string | null;
    citizenship: string | null;
    jariJilla: string | null;
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
  showShares?: boolean;
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
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-sm shadow-black/20 backdrop-blur">
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-sm">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-slate-300">{children}</label>;
}

function PersonEditor({
  label,
  person,
  onChange,
  onRemove,
  removable = false,
  showShares = false,
}: PersonEditorProps) {
  const updateField = (field: keyof Owner | keyof Witness, value: string | number | null) => {
    onChange({
      ...person,
      [field]: value,
    } as Owner | Witness);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-slate-400">Fill the details that will appear in documents.</p>
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
          <FieldLabel>Name *</FieldLabel>
          <Input
            value={person.name || ''}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Full name"
            required
            className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <FieldLabel>Father&apos;s Name</FieldLabel>
          <Input
            value={person.fatherName || ''}
            onChange={(event) => updateField('fatherName', event.target.value)}
            placeholder="Father's name"
            className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="lg:col-span-2">
          <FieldLabel>Address</FieldLabel>
          <Input
            value={person.address || ''}
            onChange={(event) => updateField('address', event.target.value)}
            placeholder="Address"
            className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <FieldLabel>Citizenship No.</FieldLabel>
          <Input
            value={person.citizenship || ''}
            onChange={(event) => updateField('citizenship', event.target.value)}
            placeholder="Citizenship number"
            className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <FieldLabel>District</FieldLabel>
          <Input
            value={person.jariJilla || ''}
            onChange={(event) => updateField('jariJilla', event.target.value)}
            placeholder="District"
            className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
          />
        </div>
        {showShares && (
          <>
            <div>
              <FieldLabel>Shares</FieldLabel>
              <Input
                value={(person as Owner).shares || ''}
                onChange={(event) => updateField('shares', event.target.value)}
                placeholder="Shares"
                className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <FieldLabel>Share Percentage</FieldLabel>
              <Input
                type="number"
                value={(person as Owner).sharePercentage ?? ''}
                onChange={(event) =>
                  updateField(
                    'sharePercentage',
                    event.target.value === '' ? null : Number(event.target.value)
                  )
                }
                placeholder="Share percentage"
                className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
              />
            </div>
          </>
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
    shares: '',
    sharePercentage: null,
    order,
  });

  const createBlankWitness = (id: string, order: number): Witness => ({
    id,
    name: '',
    fatherName: '',
    address: '',
    citizenship: '',
    jariJilla: '',
    order,
  });

  const [formData, setFormData] = useState<{
    englishName: string;
    nepaliName: string;
    registrationDate: string;
    ownerType: 'SINGLE' | 'MULTIPLE';
  }>(() => ({
    englishName: company?.englishName || '',
    nepaliName: company?.nepaliName || '',
    registrationDate: company?.registrationDate
      ? (typeof company.registrationDate === 'string'
          ? company.registrationDate.split('T')[0]
          : new Date(company.registrationDate).toISOString().split('T')[0])
      : '',
    ownerType: company?.ownerType || 'SINGLE',
  }));

  const [owners, setOwners] = useState<Owner[]>(() => {
    if (company && company.owners.length > 0) {
      return company.owners;
    }

    return [createBlankOwner('own-0', 0)];
  });

  const [witnesses, setWitnesses] = useState<Witness[]>(() => {
    if (company && company.witnesses.length > 0) {
      return company.witnesses;
    }

    return [createBlankWitness('wit-0', 0)];
  });

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

  const setOwnerType = (ownerType: 'SINGLE' | 'MULTIPLE') => {
    setFormData((current) => ({ ...current, ownerType }));

    if (ownerType === 'SINGLE') {
      setOwners((current) => (current.length > 0 ? current.slice(0, 1) : [createBlankOwner('own-0', 0)]));
      setWitnesses((current) => (current.length > 0 ? current : [createBlankWitness('wit-0', 0)]));
      return;
    }

    setOwners((current) => (current.length > 0 ? current : [createBlankOwner('own-0', 0), createBlankOwner('own-1', 1)]));
  };

  // Build runtime values from current form state (owners, witnesses, objectives)
  const runtimeValues = buildCompanyRuntimeVariableValues({
    englishName: formData.englishName,
    nepaliName: formData.nepaliName,
    ownerType: formData.ownerType,
    registrationDate: formData.registrationDate,
    owners,
    witnesses,
    objectives: selectedObjectives.map((id) => ({ text: objectives.find((o) => o.id === id)?.text || '' })),
  });

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
      ownerType: formData.ownerType,
      registrationDate: formData.registrationDate || null,
      owners: owners.map((o, idx) => ({
        name: o.name,
        fatherName: o.fatherName || null,
        address: o.address || null,
        citizenship: o.citizenship || null,
        jariJilla: o.jariJilla || null,
        shares: o.shares || null,
        sharePercentage:
          o.sharePercentage !== null && o.sharePercentage !== undefined
            ? o.sharePercentage
            : null,
        order: idx,
      })),
      witnesses: witnesses.map((w, idx) => ({
        name: w.name,
        fatherName: w.fatherName || null,
        address: w.address || null,
        citizenship: w.citizenship || null,
        jariJilla: w.jariJilla || null,
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
          <Button variant="ghost" className="px-0 text-slate-400 hover:bg-transparent hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Button>
        </Link>
        <div className="hidden rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-400 shadow-sm sm:block">
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
                <FieldLabel>Company Name (English) *</FieldLabel>
                <Input
                  value={formData.englishName}
                  onChange={(event) => setFormData({ ...formData, englishName: event.target.value })}
                  required
                  placeholder="Company name in English"
                  className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <FieldLabel>Company Name (Nepali)</FieldLabel>
                <Input
                  value={formData.nepaliName}
                  onChange={(event) => setFormData({ ...formData, nepaliName: event.target.value })}
                  placeholder="Company name in Nepali"
                  className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <FieldLabel>Registration Date</FieldLabel>
                <Input
                  type="date"
                  value={formData.registrationDate}
                  onChange={(event) =>
                    setFormData({ ...formData, registrationDate: event.target.value })
                  }
                  className="border-slate-700 bg-slate-950/60 text-white [color-scheme:dark]"
                />
              </div>
              <div>
                <FieldLabel>Ownership Structure</FieldLabel>
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-700 bg-slate-950/40 p-2">
                  <button
                    type="button"
                    onClick={() => setOwnerType('SINGLE')}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      formData.ownerType === 'SINGLE'
                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                        : 'bg-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Single Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerType('MULTIPLE')}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      formData.ownerType === 'MULTIPLE'
                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                        : 'bg-transparent text-slate-400 hover:text-white'
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
            description="Enter the owner details in clearly separated blocks, matching the document placeholders."
            icon={<Users className="h-5 w-5" />}
          >
            <div className="space-y-4">
              {owners.map((owner, index) => (
                <PersonEditor
                  key={owner.id}
                  label={`Owner ${index + 1}`}
                  person={owner}
                  onChange={(nextOwner) =>
                    setOwners((current) => current.map((item, itemIndex) => (itemIndex === index ? (nextOwner as Owner) : item)))
                  }
                  onRemove={
                    formData.ownerType === 'MULTIPLE' && owners.length > 1
                      ? () => setOwners((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      : undefined
                  }
                  removable={formData.ownerType === 'MULTIPLE' && owners.length > 1}
                  showShares={true}
                />
              ))}

              {formData.ownerType === 'MULTIPLE' && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-slate-700 bg-transparent py-6 text-slate-300 hover:bg-slate-800/40"
                  onClick={() =>
                    setOwners((current) => [
                      ...current,
                      createBlankOwner(`own-${Date.now()}`, current.length),
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Owner
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Sakshi (Witnesses)"
            description="Keep witness data separated and easy to scan while preparing documents."
            icon={<UserRound className="h-5 w-5" />}
          >
            <div className="space-y-4">
              {witnesses.map((witness, index) => (
                <PersonEditor
                  key={witness.id}
                  label={index === 0 ? 'Primary Witness' : `Witness ${index + 1}`}
                  person={witness}
                  onChange={(nextWitness) =>
                    setWitnesses((current) => current.map((item, itemIndex) => (itemIndex === index ? (nextWitness as Witness) : item)))
                  }
                  onRemove={witnesses.length > 1 ? () => setWitnesses((current) => current.filter((_, itemIndex) => itemIndex !== index)) : undefined}
                  removable={witnesses.length > 1}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-slate-700 bg-transparent py-6 text-slate-300 hover:bg-slate-800/40"
                onClick={() =>
                  setWitnesses((current) => [
                    ...current,
                    createBlankWitness(`wit-${Date.now()}`, current.length),
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Witness
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Business Objectives"
            description="Pick the objectives that should be merged into the generated document."
            icon={<FileText className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {objectives.length > 0 ? (
                objectives.map((obj) => (
                  <label
                    key={obj.id}
                    className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-800 bg-slate-800/30 p-4 transition-colors hover:bg-slate-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedObjectives.includes(obj.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedObjectives([...selectedObjectives, obj.id]);
                        } else {
                          setSelectedObjectives(selectedObjectives.filter((id) => id !== obj.id));
                        }
                      }}
                      className="mt-1 h-4 w-4 accent-slate-100"
                    />
                    <div>
                      <p className="font-medium text-white">{obj.text}</p>
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-400">No objectives configured yet. Add them in the Objectives section.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Variable Values"
            description="Fill any remaining document variables that are not derived automatically from the company record."
            icon={<BadgeInfo className="h-5 w-5" />}
          >
            {variables.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {variables.map((variable) => {
                  const inputType = variable.type === 'date' ? 'date' : variable.type === 'number' ? 'number' : 'text';
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
                          className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition-shadow focus:border-slate-500 focus:ring-2 focus:ring-slate-700"
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
                          className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No variables configured yet.</p>
            )}
          </SectionCard>
        </div>

        <aside className="sticky top-6 self-start">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Live summary</p>
            <h3 className="mt-2 text-2xl font-semibold">Ready to generate</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Keep the form sections separated so each document part can be scanned quickly before saving.
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-400">Company name</span>
                <span className="font-medium text-white">{formData.englishName || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-400">Owners</span>
                <span className="font-medium text-white">{owners.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-400">Witnesses</span>
                <span className="font-medium text-white">{witnesses.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-400">Selected objectives</span>
                <span className="font-medium text-white">{selectedObjectives.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-slate-400">Variable fields</span>
                <span className="font-medium text-white">{totalVariableFields}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button className="h-12 bg-white text-slate-950 hover:bg-slate-100" type="submit">
                {company ? 'Update Company' : 'Create Company'}
              </Button>
              <Link href="/companies">
                <Button variant="outline" className="h-12 w-full border-slate-700 bg-transparent text-white hover:bg-white/10">
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
