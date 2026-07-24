'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronUp, Trash2, Download } from 'lucide-react';

function DocumentFileViewer({ docxUrl }: { docxUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!docxUrl || !containerRef.current) return;
    let active = true;

    async function loadAndRender() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(docxUrl);
        if (!response.ok) throw new Error('Failed to fetch document file');
        const arrayBuffer = await response.arrayBuffer();

        const { renderAsync } = await import('docx-preview');
        if (containerRef.current && active) {
          containerRef.current.innerHTML = '';
          await renderAsync(arrayBuffer, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            experimental: false,
          });
        }
      } catch (err) {
        console.error('Error rendering docx file:', err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAndRender();

    return () => {
      active = false;
    };
  }, [docxUrl]);

  if (error) {
    return (
      <div className="p-4 text-xs text-rose-500 text-center">
        Unable to render document preview. Use the Download button above to view the file.
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden">
      {loading && (
        <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
          Loading Word document preview...
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full bg-slate-200/60 dark:bg-slate-950 p-4 rounded-lg overflow-y-auto max-h-[800px] text-slate-900 [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-2 [&_.docx-wrapper]:!flex [&_.docx-wrapper]:!flex-col [&_.docx-wrapper]:!items-center [&_.docx-wrapper_section.docx]:!max-w-full [&_.docx-wrapper_section.docx]:!shadow-xl [&_.docx-wrapper_section.docx]:!mb-8 [&_.docx-wrapper_section.docx]:!box-border"
      />
    </div>
  );
}

export default function DocumentsPage() {
  const { documents, deleteDocument, loading } = useAppDataContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No documents generated yet.
              </p>
              <Link href="/documents/generate">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
                        Generated: {new Date(doc.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                          if (window.confirm('Are you sure you want to delete this document?')) {
                            deleteDocument(doc.id);
                          }
                        }}
                        className="text-slate-500 hover:text-red-600 transition-colors p-2"
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
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                      <DocumentFileViewer docxUrl={doc.docxUrl} />
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
