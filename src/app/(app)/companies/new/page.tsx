'use client';

import { useRouter } from 'next/navigation';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { CompanyForm } from '@/components/CompanyForm';
import { PageHeader } from '@/components/PageHeader';

export default function NewCompanyPage() {
  const router = useRouter();
  const { objectives, variables, addCompany } = useAppDataContext();

  const handleSubmit = async (companyData: any) => {
    await addCompany(companyData);
    router.push('/companies');
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Create New Company"
        description="Add a new company to the system"
      />
      <div className="flex-1 p-6">
        <CompanyForm
          objectives={objectives}
          variables={variables}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
