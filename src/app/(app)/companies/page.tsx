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
  const { companies, deleteCompany, loading } = useAppDataContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch = company.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [companies, searchTerm]);

  const columns: Column<Company>[] = [
    {
      key: 'name',
      label: 'Company Name',
      render: (value) => (
        <span className="font-medium text-foreground">{value}</span>
      ),
    },
    {
      key: 'registrationDate',
      label: 'Registration Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'ownerType',
      label: 'Ownership',
      render: (value, company: Company) =>
        value === 'SINGLE'
          ? 'Single Owner'
          : `Multiple Owners (${company.owners?.length || 0})`,
    },
    {
      key: 'updatedAt',
      label: 'Last Modified',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'documentCount' as any,
      label: 'Documents',
      render: (_, company: Company) => company.documentCount ?? 0,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Companies"
        description="Manage your company database and information"
        actions={
          <Link href="/companies/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
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
                placeholder="Search by company name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-foreground"
              />
            </div>
          </div>
          {searchTerm && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing {filteredCompanies.length} of {companies.length} companies
            </p>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              Loading companies...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredCompanies}
              onEdit={(company) => {
                window.location.href = `/companies/${company.id}`;
              }}
              onDelete={deleteCompany}
              emptyMessage={
                companies.length === 0
                  ? 'No companies yet. Create one to get started!'
                  : 'No companies match your filters.'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
