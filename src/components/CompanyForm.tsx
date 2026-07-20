'use client';

import { useState, useEffect } from 'react';
import { Company, CompanyObjectiveTemplate, Owner, Witness } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DynamicList } from '@/components/DynamicList';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

interface CompanyFormProps {
  company?: Company;
  objectives: CompanyObjectiveTemplate[];
  onSubmit: (company: any) => void;
}

export function CompanyForm({
  company,
  objectives,
  onSubmit,
}: CompanyFormProps) {
  const [formData, setFormData] = useState<{
    name: string;
    registrationDate: string;
    ownerType: 'SINGLE' | 'MULTIPLE';
  }>({
    name: '',
    registrationDate: '',
    ownerType: 'SINGLE',
  });

  const [owners, setOwners] = useState<Owner[]>([]);
  const [primaryWitness, setPrimaryWitness] = useState<Witness>({
    id: 'wit-primary',
    name: '',
    address: '',
    order: 0,
  });
  const [additionalWitnesses, setAdditionalWitnesses] = useState<Witness[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  const setOwnerType = (ownerType: 'SINGLE' | 'MULTIPLE') => {
    setFormData((current) => ({ ...current, ownerType }));

    if (ownerType === 'SINGLE') {
      setOwners((current) => current.slice(0, 1));
    }
  };

  const setSingleOwnerField = (field: 'name' | 'address', value: string) => {
    setOwners((current) => {
      const existing = current[0];

      if (!existing) {
        return [
          {
            id: `own-${Date.now()}`,
            name: field === 'name' ? value : '',
            address: field === 'address' ? value : '',
            order: 0,
          },
        ];
      }

      return [
        {
          ...existing,
          [field]: value,
          order: 0,
        },
      ];
    });
  };

  const clearSingleOwner = () => {
    setOwners([]);
  };

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        registrationDate: company.registrationDate
          ? (typeof company.registrationDate === 'string'
              ? company.registrationDate.split('T')[0]
              : new Date(company.registrationDate).toISOString().split('T')[0])
          : '',
        ownerType: company.ownerType,
      });
      setOwners(company.owners || []);
      setPrimaryWitness(
        company.witnesses?.[0] || {
          id: 'wit-primary',
          name: '',
          address: '',
          order: 0,
        }
      );
      setAdditionalWitnesses(company.witnesses ? company.witnesses.slice(1) : []);
      setSelectedObjectives(
        company.objectives ? company.objectives.map((o) => o.sourceObjectiveId || '') : []
      );
    }
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedCompany = {
      name: formData.name,
      ownerType: formData.ownerType,
      registrationDate: formData.registrationDate || null,
      owners: owners.map((o, idx) => ({
        name: o.name,
        address: o.address || null,
        sharePercentage: o.sharePercentage || null,
        order: idx,
      })),
      witnesses: [primaryWitness, ...additionalWitnesses].map((w, idx) => ({
        name: w.name,
        address: w.address || null,
        order: idx,
      })),
      objectives: selectedObjectives.map((objId, idx) => ({
        sourceObjectiveId: objId,
        text: objectives.find((o) => o.id === objId)?.text || '',
        order: idx,
      })),
    };

    onSubmit(formattedCompany);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/companies">
        <Button variant="ghost" className="mb-4 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </Button>
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Registration Date
              </label>
              <Input
                type="date"
                value={formData.registrationDate}
                onChange={(e) =>
                  setFormData({ ...formData, registrationDate: e.target.value })
                }
                className="bg-white dark:bg-slate-800 text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Ownership Type */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Ownership Structure</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="ownershipType"
                checked={formData.ownerType === 'SINGLE'}
                onChange={() => setOwnerType('SINGLE')}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-foreground">Single Owner</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="ownershipType"
                checked={formData.ownerType === 'MULTIPLE'}
                onChange={() => setOwnerType('MULTIPLE')}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-foreground">Multiple Owners</span>
            </label>
          </div>
        </div>

        {/* Owners */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          {formData.ownerType === 'SINGLE' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Owner</h3>
                  <p className="text-xs text-slate-500">Single owner mode allows exactly one owner.</p>
                </div>
                <button
                  type="button"
                  onClick={clearSingleOwner}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-foreground transition-colors"
                  aria-label="Clear owner"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Owner Name *
                </label>
                <Input
                  value={owners[0]?.name || ''}
                  onChange={(e) => setSingleOwnerField('name', e.target.value)}
                  placeholder="Enter owner name"
                  className="bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Address (optional)
                </label>
                <Input
                  value={owners[0]?.address || ''}
                  onChange={(e) => setSingleOwnerField('address', e.target.value)}
                  placeholder="Enter owner address"
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          ) : (
            <DynamicList
              items={owners}
              onAdd={(name, address) => {
                setOwners([
                  ...owners,
                  { id: `own-${Date.now()}`, name, address, order: owners.length },
                ]);
              }}
              onRemove={(id) => setOwners(owners.filter((o) => o.id !== id))}
              label="Owners"
              showAddress={true}
            />
          )}
        </div>

        {/* Witnesses */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Primary Witness</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Witness Name *
                  </label>
                  <Input
                    value={primaryWitness.name}
                    onChange={(e) =>
                      setPrimaryWitness((current) => ({ ...current, name: e.target.value }))
                    }
                    placeholder="Enter witness name"
                    className="bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Address (optional)
                  </label>
                  <Input
                    value={primaryWitness.address || ''}
                    onChange={(e) =>
                      setPrimaryWitness((current) => ({ ...current, address: e.target.value }))
                    }
                    placeholder="Enter witness address"
                    className="bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <DynamicList
              items={additionalWitnesses}
              onAdd={(name, address) => {
                setAdditionalWitnesses([
                  ...additionalWitnesses,
                  { id: `wit-${Date.now()}`, name, address, order: additionalWitnesses.length + 1 },
                ]);
              }}
              onRemove={(id) => setAdditionalWitnesses(additionalWitnesses.filter((w) => w.id !== id))}
              label="Additional Witnesses"
              showAddress={true}
            />
          </div>
        </div>

        {/* Objectives */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Business Objectives</h2>
          <div className="space-y-2">
            {objectives.map((obj) => (
              <label
                key={obj.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedObjectives.includes(obj.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedObjectives([...selectedObjectives, obj.id]);
                    } else {
                      setSelectedObjectives(
                        selectedObjectives.filter((o) => o !== obj.id)
                      );
                    }
                  }}
                  className="w-4 h-4 accent-blue-600"
                />
                <div>
                  <p className="font-medium text-foreground">{obj.text}</p>
                </div>
              </label>
            ))}
            {objectives.length === 0 && (
              <p className="text-sm text-slate-500">No objectives configured yet. Add them in the Objectives section.</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Link href="/companies">
            <Button variant="outline" className="border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Button>
          </Link>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" type="submit">
            {company ? 'Update Company' : 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  );
}
