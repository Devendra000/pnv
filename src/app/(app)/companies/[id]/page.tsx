'use client';

import { useRouter, useParams } from 'next/navigation';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { CompanyForm } from '@/components/CompanyForm';
import { PageHeader } from '@/components/PageHeader';

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getCompany, updateCompany, objectives, loading } = useAppDataContext();

  const company = getCompany(params.id as string);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <PageHeader title="Loading Company..." />
        <div className="flex-1 p-6 text-slate-500">Loading company details...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="h-full flex flex-col">
        <PageHeader title="Company Not Found" />
        <div className="flex-1 p-6">
          <p className="text-slate-600 dark:text-slate-400">
            The company you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (updatedCompanyData: any) => {
    await updateCompany(company.id, updatedCompanyData);
    router.push('/companies');
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={`Edit Company: ${company.name}`}
        description="Update company information"
      />
      <div className="flex-1 p-6">
        <CompanyForm
          company={company}
          objectives={objectives}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
