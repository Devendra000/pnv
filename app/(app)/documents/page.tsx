'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Document } from '@/lib/types';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export default function DocumentsPage() {
  const { documents, deleteDocument } = useAppDataContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Documents"
        description="View and manage generated documents"
        actions={
          <Link href="/documents/generate">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Generate Document
            </Button>
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {documents.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No documents generated yet.
              </p>
              <Link href="/documents/generate">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Generate Your First Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() =>
                      setExpandedId(expandedId === doc.id ? null : doc.id)
                    }
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">
                        {doc.templateName} - {doc.companyName}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Generated: {doc.generatedDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                          doc.content
                        )}`}
                        download={`${doc.templateName}-${doc.companyName}.txt`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm">
                          Download
                        </Button>
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(doc.id);
                        }}
                        className="text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {expandedId === doc.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                  </div>
                  {expandedId === doc.id && (
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words font-mono">
                        {doc.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
