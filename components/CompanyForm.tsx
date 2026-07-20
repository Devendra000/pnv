'use client';

import { useState, useEffect } from 'react';
import { Company, CompanyObjectiveTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DynamicList, ListItem } from '@/components/DynamicList';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CompanyFormProps {
  company?: Company;
  objectives: CompanyObjectiveTemplate[];
  onSubmit: (company: Company) => void;
}

export function CompanyForm({
  company,
  objectives,
  onSubmit,
}: CompanyFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    country: '',
    industry: '',
    singleOwner: true,
  });

  const [owners, setOwners] = useState<ListItem[]>([]);
  const [witnesses, setWitnesses] = useState<ListItem[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        registrationNumber: company.registrationNumber,
        country: company.country,
        industry: company.industry,
        singleOwner: company.singleOwner,
      });
      setOwners(company.owners);
      setWitnesses(company.witnesses);
      setSelectedObjectives(company.objectives.map((o) => o.objectiveId));
    }
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newCompany: Company = {
      id: company?.id || `comp-${Date.now()}`,
      ...formData,
      owners,
      witnesses,
      objectives: selectedObjectives.map((objId) => ({
        id: `obj-${Date.now()}-${Math.random()}`,
        objectiveId: objId,
        text: objectives.find((o) => o.id === objId)?.name || '',
      })),
      dateCreated: company?.dateCreated || new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      documentCount: company?.documentCount || 0,
    };

    onSubmit(newCompany);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/companies">
        <Button variant="ghost" className="mb-4">
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Registration Number *
              </label>
              <Input
                value={formData.registrationNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registrationNumber: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Country *
              </label>
              <Input
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Industry *
              </label>
              <Input
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                required
              />
            </div>
          </div>
        </div>

        {/* Ownership Type */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Ownership Structure</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="ownershipType"
                checked={formData.singleOwner}
                onChange={() =>
                  setFormData({ ...formData, singleOwner: true })
                }
                className="w-4 h-4"
              />
              <span className="text-foreground">Single Owner</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="ownershipType"
                checked={!formData.singleOwner}
                onChange={() =>
                  setFormData({ ...formData, singleOwner: false })
                }
                className="w-4 h-4"
              />
              <span className="text-foreground">Multiple Owners</span>
            </label>
          </div>
        </div>

        {/* Owners */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <DynamicList
            items={owners}
            onAdd={(name, role) => {
              setOwners([
                ...owners,
                { id: `own-${Date.now()}`, name, role },
              ]);
            }}
            onRemove={(id) => setOwners(owners.filter((o) => o.id !== id))}
            label="Owners"
            showRole={true}
          />
        </div>

        {/* Witnesses */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <DynamicList
            items={witnesses}
            onAdd={(name, role) => {
              setWitnesses([
                ...witnesses,
                { id: `wit-${Date.now()}`, name, role },
              ]);
            }}
            onRemove={(id) => setWitnesses(witnesses.filter((w) => w.id !== id))}
            label="Witnesses"
            showRole={true}
          />
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
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium text-foreground">{obj.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {obj.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Link href="/companies">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button className="bg-blue-600 hover:bg-blue-700" type="submit">
            {company ? 'Update Company' : 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  );
}
