'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Building, MapPin, Calendar, Users, ListTodo, FileText, ArrowLeft } from 'lucide-react';

export default function CompanyViewPage() {
  const router = useRouter();
  const params = useParams();
  const { getCompany, loading } = useAppDataContext();

  const company = getCompany(params?.id as string);

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
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="p-6 pb-4">
          <button
            onClick={() => router.back()}
            className="mb-4 text-xs font-semibold text-slate-500 hover:text-primary transition-colors flex items-center gap-1.5 uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Building className="w-7 h-7" />
                </div>
                {company.englishName}
              </h1>
              {company.nepaliName && (
                <p className="text-xl text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  {company.nepaliName}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                {company.companyAddress || 'Address not provided'}
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                Created {new Date(company.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Owners Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              Owners ({company.ownerType})
            </h3>
            {company.owners && company.owners.length > 0 ? (
              <div className="space-y-3">
                {company.owners.map((owner, idx) => (
                  <div key={owner.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{idx + 1}. {owner.name}</span>
                      {owner.shares && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{owner.shares} Shares</span>}
                    </div>
                    {(owner.phoneNumber || owner.address) && (
                      <div className="text-xs text-slate-500 mt-1 flex gap-3">
                        {owner.phoneNumber && <span>📞 {owner.phoneNumber}</span>}
                        {owner.address && <span>📍 {owner.address}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No owners specified.</p>
            )}
          </div>

          {/* Objectives Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <ListTodo className="w-5 h-5 text-amber-500" />
              Objectives
            </h3>
            {company.objectives && company.objectives.length > 0 ? (
              <ul className="space-y-2">
                {company.objectives.map((obj, idx) => (
                  <li key={obj.id} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <span className="text-amber-500 font-bold shrink-0">{idx + 1}.</span>
                    <span className="leading-relaxed">{obj.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">No objectives added.</p>
            )}
          </div>

          {/* Variables Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-rose-500" />
              Variable Values
            </h3>
            {company.variableValues && company.variableValues.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {company.variableValues.map(vv => (
                  <div key={vv.id} className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">{vv.variableLabel || vv.variableKey}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{vv.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No variables set.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
