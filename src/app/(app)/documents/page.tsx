'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronUp, Trash2, Download, Folder, FileText } from 'lucide-react';

export default function DocumentsPage() {
  const { companies, documents, deleteDocument, loading } = useAppDataContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const folders = useMemo(() => {
    return companies
      .map((company) => ({
        companyId: company.id,
        companyName: company.name,
        documents: documents.filter((document) => document.companyId === company.id),
      }))
      .sort((left, right) => left.companyName.localeCompare(right.companyName));
  }, [companies, documents]);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Documents"
        description="View and manage generated documents"
        actions={
          <Link href="/documents/generate">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
              <Plus className="w-4 h-4 mr-2" />
              Generate Document
            </Button>
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading documents...</div>
          ) : folders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No company folders yet.
              </p>
              <Link href="/documents/generate">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Generate Your First Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {folders.map((folder) => {
                const folderId = folder.companyId;
                const isExpanded = expandedId === folderId;

                return (
                  <div
                    key={folderId}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : folderId)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground truncate">
                            {folder.companyName}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {folder.documents.length} document{folder.documents.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60">
                        <div className="space-y-3">
                          {folder.documents.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 px-4 py-6 text-sm text-slate-500">
                              No generated documents in this folder yet.
                            </div>
                          ) : folder.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <FileText className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                                <div className="min-w-0">
                                  <h4 className="font-medium text-foreground truncate">
                                    {doc.templateName}
                                  </h4>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Generated: {new Date(doc.generatedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                  href={doc.docxUrl}
                                  download={`${doc.templateName}-${doc.companyName}.docx`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="no-underline"
                                >
                                  <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                  </Button>
                                </a>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDocument(doc.id);
                                  }}
                                  className="text-slate-500 hover:text-red-600 transition-colors p-2"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
