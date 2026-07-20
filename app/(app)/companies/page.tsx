'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Company } from '@/lib/types';
import { Plus, Search } from 'lucide-react';

export default function CompaniesPage() {
  const { companies, deleteCompany } = useAppDataContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch = company.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        company.registrationNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesIndustry = industryFilter === '' || company.industry === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [companies, searchTerm, industryFilter]);

  const industries = Array.from(new Set(companies.map((c) => c.industry)));

  const columns: Column<Company>[] = [
    {
      key: 'name',
      label: 'Company Name',
      render: (value) => (
        <span className="font-medium text-foreground">{value}</span>
      ),
    },
    { key: 'registrationNumber', label: 'Registration Number' },
    { key: 'country', label: 'Country' },
    { key: 'industry', label: 'Industry' },
    {
      key: 'singleOwner' as any,
      label: 'Ownership',
      render: (_, company: Company) =>
        company.singleOwner ? 'Single Owner' : `Multiple Owners (${company.owners.length})`,
    },
    {
      key: 'lastModified',
      label: 'Last Modified',
    },
    {
      key: 'documentCount' as any,
      label: 'Documents',
      render: (_, company: Company) => company.documentCount,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Companies"
        description="Manage your company database and information"
        actions={
          <Link href="/companies/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Company
            </Button>
          </Link>
        }
      />

      <div className="flex-1 p-6 flex flex-col">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search by company name or registration number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-foreground"
            >
              <option value="">All Industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
          {(searchTerm || industryFilter) && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {filteredCompanies.length} of {companies.length} companies
            </p>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredCompanies}
            onEdit={(company) => {
              window.location.href = `/companies/${company.id}`;
            }}
            onDelete={deleteCompany}
            emptyMessage={companies.length === 0 ? 'No companies yet. Create one to get started!' : 'No companies match your filters.'}
          />
        </div>
      </div>
    </div>
  );
}
