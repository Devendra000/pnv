'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CompanyFolder, Document } from '@/lib/types';
import {
  copyDocumentAction,
  createCompanyFolderAction,
  deleteCompanyFolderAction,
  deleteDocumentAction,
  listAllCompanyFoldersAction,
  moveCompanyFolderAction,
  moveDocumentAction,
  renameCompanyFolderAction,
  renameDocumentAction,
} from '@/lib/actions';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  FileText,
  Folder,
  FolderPlus,
  Grid,
  List as ListIcon,
  MoveRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

function FolderBranch({
  folders,
  folder,
  activeFolderId,
  expandedFolderIds,
  onOpen,
  onToggleExpand,
  depth = 0,
}: {
  folders: CompanyFolder[];
  folder: CompanyFolder;
  activeFolderId: string | null;
  expandedFolderIds: Set<string>;
  onOpen: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  depth?: number;
}) {
  const children = folders.filter((item) => item.parentFolderId === folder.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedFolderIds.has(folder.id);
  const isActive = activeFolderId === folder.id;

  return (
    <div>
      <div
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        className={`flex w-full items-center justify-between rounded-lg py-1.5 pr-2 transition-colors ${
          isActive
            ? 'bg-blue-600 font-medium text-white shadow-sm'
            : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className={`rounded p-0.5 transition-colors hover:bg-slate-300/50 dark:hover:bg-slate-700/50 ${
                isActive ? 'text-white' : 'text-slate-500'
              }`}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <button
            type="button"
            onClick={() => {
              onOpen(folder.id);
              if (hasChildren && !isExpanded) {
                onToggleExpand(folder.id);
              }
            }}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
          >
            <Folder className="h-4 w-4 shrink-0 text-amber-400 fill-amber-400/20" />
            <span className="truncate">{folder.name}</span>
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <FolderBranch
              key={child.id}
              folders={folders}
              folder={child}
              activeFolderId={activeFolderId}
              expandedFolderIds={expandedFolderIds}
              onOpen={onOpen}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ModalState =
  | { type: 'createFolder' }
  | { type: 'renameFolder'; folder: CompanyFolder }
  | { type: 'renameDoc'; doc: Document }
  | { type: 'moveFolder'; folder: CompanyFolder }
  | { type: 'moveDoc'; doc: Document }
  | { type: 'copyDoc'; doc: Document }
  | null;

export default function DocumentsPage() {
  const { companies, documents, loading, refreshData } = useAppDataContext();
  const [folders, setFolders] = useState<CompanyFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalState, setModalState] = useState<ModalState>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  const reloadFolders = async () => setFolders(await listAllCompanyFoldersAction());

  useEffect(() => {
    if (!companies.length) return;
    listAllCompanyFoldersAction()
      .then(setFolders)
      .catch((error) => console.error('Unable to load document folders:', error));
  }, [companies.length]);

  // Restore activeFolderId & viewMode from sessionStorage on mount
  useEffect(() => {
    try {
      const savedFolderId = sessionStorage.getItem('docgen_active_folder_id');
      if (savedFolderId) {
        setActiveFolderId(savedFolderId);
      }
      const savedViewMode = sessionStorage.getItem('docgen_view_mode') as 'grid' | 'list' | null;
      if (savedViewMode === 'grid' || savedViewMode === 'list') {
        setViewMode(savedViewMode);
      }
    } catch (e) {
      console.error('Failed to read from sessionStorage:', e);
    }
  }, []);

  const changeActiveFolderId = (folderId: string | null) => {
    setActiveFolderId(folderId);
    try {
      if (folderId) {
        sessionStorage.setItem('docgen_active_folder_id', folderId);
      } else {
        sessionStorage.removeItem('docgen_active_folder_id');
      }
    } catch (e) {
      console.error('Failed to write active folder to sessionStorage:', e);
    }
  };

  const changeViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      sessionStorage.setItem('docgen_view_mode', mode);
    } catch (e) {
      console.error('Failed to write view mode to sessionStorage:', e);
    }
  };

  // Whenever activeFolderId changes, set expandedFolderIds ONLY to the active folder and its ancestors
  useEffect(() => {
    const next = new Set<string>();
    if (activeFolderId) {
      let curr = folders.find((f) => f.id === activeFolderId);
      while (curr) {
        next.add(curr.id);
        curr = folders.find((f) => f.id === curr?.parentFolderId);
      }
    }
    setExpandedFolderIds(next);
  }, [activeFolderId, folders]);

  const toggleExpand = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const activeFolder = folders.find((folder) => folder.id === activeFolderId) || null;
  const activeCompany = companies.find((company) => company.id === activeFolder?.companyId) || null;
  const rootFolders = useMemo(() => folders.filter((folder) => !folder.parentFolderId), [folders]);
  const childFolders = useMemo(
    () => folders.filter((folder) => folder.parentFolderId === activeFolderId),
    [activeFolderId, folders]
  );
  const currentDocuments = useMemo(() => {
    if (!activeFolder) return [];
    return documents.filter(
      (document) => document.companyId === activeFolder.companyId && document.folderId === activeFolder.id
    );
  }, [activeFolder, documents]);
  const rootDocuments = useMemo(() => documents.filter((document) => !document.folderId), [documents]);

  const breadcrumbs = useMemo(() => {
    const trail: CompanyFolder[] = [];
    let current = activeFolder;
    while (current) {
      trail.unshift(current);
      current = folders.find((folder) => folder.id === current?.parentFolderId) || null;
    }
    return trail;
  }, [activeFolder, folders]);

  const openCreateFolderModal = () => {
    if (!activeFolder) return;
    setRenameInputValue('');
    setModalState({ type: 'createFolder' });
  };

  const handleCreateFolder = async (name: string) => {
    if (!activeFolder || !name.trim()) return;
    try {
      const created = await createCompanyFolderAction({
        companyId: activeFolder.companyId,
        parentFolderId: activeFolder.id,
        name: name.trim(),
      });
      setModalState(null);
      await reloadFolders();
      changeActiveFolderId(created.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to create folder.');
    }
  };

  // Folder Actions
  const handleRenameFolder = async (folder: CompanyFolder, newName: string) => {
    if (!newName.trim()) return;
    try {
      await renameCompanyFolderAction(folder.id, newName.trim());
      setModalState(null);
      await reloadFolders();
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to rename folder.');
    }
  };

  const handleDeleteFolder = async (folder: CompanyFolder) => {
    const isRoot = !folder.parentFolderId;
    const promptMsg = isRoot
      ? `Delete root company folder "${folder.name}"? Note: Delete the company to remove root folders.`
      : `Are you sure you want to delete folder "${folder.name}" and all contents inside it?`;

    if (isRoot) {
      alert('To remove a root company folder, please delete the company from the Companies page.');
      return;
    }

    if (window.confirm(promptMsg)) {
      try {
        await deleteCompanyFolderAction(folder.id);
        if (activeFolderId === folder.id) {
          changeActiveFolderId(folder.parentFolderId || null);
        }
        await reloadFolders();
        await refreshData();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete folder.');
      }
    }
  };

  const handleMoveFolder = async (folderId: string, targetParentFolderId: string) => {
    try {
      await moveCompanyFolderAction(folderId, targetParentFolderId);
      setModalState(null);
      await reloadFolders();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to move folder.');
    }
  };

  // Document Actions
  const handleRenameDocument = async (doc: Document, newName: string) => {
    if (!newName.trim()) return;
    try {
      await renameDocumentAction(doc.id, newName.trim());
      setModalState(null);
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to rename document.');
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    const docName = doc.fileName || `${doc.templateName}.docx`;
    if (window.confirm(`Are you sure you want to delete "${docName}"?`)) {
      try {
        await deleteDocumentAction(doc.id);
        await refreshData();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete document.');
      }
    }
  };

  const handleMoveDocument = async (docId: string, targetFolderId: string) => {
    try {
      await moveDocumentAction(docId, targetFolderId);
      setModalState(null);
      await refreshData();
      await reloadFolders();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to move document.');
    }
  };

  const handleCopyDocument = async (docId: string, targetFolderId: string) => {
    try {
      await copyDocumentAction(docId, targetFolderId);
      setModalState(null);
      await refreshData();
      await reloadFolders();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to copy document.');
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/60 dark:bg-slate-950">
      <PageHeader
        title="Document Manager"
        description="Browse, organize, rename, move, and copy company documents"
        actions={
          <Link href="/documents/generate">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Generate document
            </Button>
          </Link>
        }
      />

      <div className="min-h-0 flex-1 p-4 md:p-6">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading documents…</p>
        ) : (
          <div className="mx-auto grid h-full max-w-7xl min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[280px_1fr]">
            {/* Sidebar Navigation */}
            <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950 md:border-b-0 md:border-r">
              <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Companies
              </p>
              {companies.map((company) => {
                const root = rootFolders.find((folder) => folder.companyId === company.id);
                return (
                  <div key={company.id} className="mb-1">
                    {root ? (
                      <FolderBranch
                        folders={folders}
                        folder={{ ...root, name: company.englishName }}
                        activeFolderId={activeFolderId}
                        expandedFolderIds={expandedFolderIds}
                        onOpen={changeActiveFolderId}
                        onToggleExpand={toggleExpand}
                      />
                    ) : (
                      <p className="px-2 py-1.5 text-sm text-slate-500">{company.englishName}</p>
                    )}
                  </div>
                );
              })}
              {!companies.length && (
                <p className="p-3 text-sm text-slate-500">Create a company to start managing documents.</p>
              )}
            </aside>

            {/* Main Folder Explorer */}
            <main className="flex min-w-0 flex-col">
              {/* Explorer Toolbar / Breadcrumbs */}
              <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-1 overflow-hidden text-sm">
                  <button
                    onClick={() => changeActiveFolderId(null)}
                    className="shrink-0 font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300"
                  >
                    Companies
                  </button>
                  {breadcrumbs.map((folder) => (
                    <span key={folder.id} className="flex min-w-0 items-center gap-1">
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      <button
                        onClick={() => changeActiveFolderId(folder.id)}
                        className="truncate font-medium hover:text-blue-600"
                      >
                        {folder.name}
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950">
                    <button
                      onClick={() => changeViewMode('grid')}
                      title="Grid view"
                      className={`rounded-md p-1.5 text-xs transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => changeViewMode('list')}
                      title="List view"
                      className={`rounded-md p-1.5 text-xs transition-colors ${
                        viewMode === 'list'
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <ListIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!activeFolder}
                    onClick={openCreateFolderModal}
                    className="border-slate-300 dark:border-slate-700"
                  >
                    <FolderPlus className="mr-1.5 h-4 w-4" />
                    New folder
                  </Button>
                </div>
              </div>

              {/* Folder & Document Grid/List View */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                {!activeFolder ? (
                  /* Root View: All Company Folders */
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {rootFolders.map((folder) => {
                      const company = companies.find((item) => item.id === folder.companyId);
                      const folderName = company?.englishName || folder.name;
                      return (
                        <div
                          key={folder.id}
                          className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
                        >
                          <button
                            onClick={() => changeActiveFolderId(folder.id)}
                            className="w-full text-left"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <Folder className="h-10 w-10 text-amber-400 fill-amber-400/30 transition-transform group-hover:scale-105" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Company Root
                              </span>
                            </div>
                            <p className="truncate font-semibold text-slate-900 dark:text-white">{folderName}</p>
                            <p className="mt-1 text-xs text-slate-500">Company documents folder</p>
                          </button>

                          {/* Hover Actions Bar */}
                          <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-200/60 pt-2 opacity-0 transition-opacity group-hover:opacity-100 dark:border-slate-800">
                            <button
                              onClick={() => {
                                setModalState({ type: 'renameFolder', folder });
                                setRenameInputValue(folderName);
                              }}
                              title="Rename folder"
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {rootDocuments.length > 0 && (
                      <p className="col-span-full mt-4 text-sm text-amber-600">
                        {rootDocuments.length} older document(s) have not yet been assigned to a company folder.
                      </p>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Grid View (Windows Explorer Tile Cards) */
                  <div className="space-y-6">
                    {/* Folders Section */}
                    {childFolders.length > 0 && (
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Folders ({childFolders.length})
                        </p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {childFolders.map((folder) => (
                            <div
                              key={folder.id}
                              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
                            >
                              <button
                                onClick={() => changeActiveFolderId(folder.id)}
                                className="w-full text-left"
                              >
                                <Folder className="mb-3 h-10 w-10 text-amber-400 fill-amber-400/30 transition-transform group-hover:scale-105" />
                                <p className="truncate font-semibold text-slate-900 dark:text-white">
                                  {folder.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {new Date(folder.updatedAt).toLocaleDateString()}
                                </p>
                              </button>

                              {/* Hover Actions Bar for Child Folders */}
                              <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-200/60 pt-2 opacity-0 transition-opacity group-hover:opacity-100 dark:border-slate-800">
                                <button
                                  onClick={() => {
                                    setModalState({ type: 'renameFolder', folder });
                                    setRenameInputValue(folder.name);
                                  }}
                                  title="Rename"
                                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setModalState({ type: 'moveFolder', folder })}
                                  title="Move to folder"
                                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                  <MoveRight className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFolder(folder)}
                                  title="Delete folder"
                                  className="rounded-lg p-1.5 text-slate-600 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files Section */}
                    {currentDocuments.length > 0 && (
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Documents ({currentDocuments.length})
                        </p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {currentDocuments.map((doc) => {
                            const displayName = doc.fileName || `${doc.templateName}.docx`;
                            return (
                              <div
                                key={doc.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
                              >
                                <div className="w-full text-left">
                                  <div className="mb-3 flex items-start justify-between">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                                      DOCX
                                    </span>
                                  </div>
                                  <p className="truncate font-semibold text-slate-900 dark:text-white" title={displayName}>
                                    {displayName}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {new Date(doc.generatedAt).toLocaleDateString()}
                                  </p>
                                </div>

                                {/* Hover Actions Bar for Files */}
                                <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-200/60 pt-2 opacity-0 transition-opacity group-hover:opacity-100 dark:border-slate-800">
                                  <a
                                    href={doc.docxUrl}
                                    download={displayName}
                                    title="Download"
                                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                  <button
                                    onClick={() => {
                                      setModalState({ type: 'renameDoc', doc });
                                      setRenameInputValue(doc.fileName || doc.templateName);
                                    }}
                                    title="Rename"
                                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setModalState({ type: 'copyDoc', doc })}
                                    title="Copy to folder"
                                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setModalState({ type: 'moveDoc', doc })}
                                    title="Move to folder"
                                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                  >
                                    <MoveRight className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc)}
                                    title="Delete document"
                                    className="rounded-lg p-1.5 text-slate-600 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!childFolders.length && !currentDocuments.length && (
                      <div className="py-16 text-center">
                        <Folder className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-700" />
                        <p className="text-sm font-medium text-slate-500">This folder is empty.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* List View (Windows Explorer Details View) */
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-[minmax(0,1fr)_120px_180px] border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                      <span>Name</span>
                      <span>Date</span>
                      <span className="text-right">Actions</span>
                    </div>

                    {/* Child Folders in List View */}
                    {childFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="group grid grid-cols-[minmax(0,1fr)_120px_180px] items-center border-b px-4 py-3 text-sm transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                      >
                        <button
                          onClick={() => changeActiveFolderId(folder.id)}
                          className="flex min-w-0 items-center gap-2 text-left font-medium text-slate-900 dark:text-white"
                        >
                          <Folder className="h-5 w-5 shrink-0 text-amber-400 fill-amber-400/30" />
                          <span className="truncate">{folder.name}</span>
                        </button>
                        <span className="text-xs text-slate-500">
                          {new Date(folder.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setModalState({ type: 'renameFolder', folder });
                              setRenameInputValue(folder.name);
                            }}
                            title="Rename"
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setModalState({ type: 'moveFolder', folder })}
                            title="Move folder"
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                          >
                            <MoveRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder)}
                            title="Delete folder"
                            className="rounded p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Files in List View */}
                    {currentDocuments.map((doc) => {
                      const displayName = doc.fileName || `${doc.templateName}.docx`;
                      return (
                        <div
                          key={doc.id}
                          className="group grid grid-cols-[minmax(0,1fr)_120px_180px] items-center border-b px-4 py-3 text-sm transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                            <span className="truncate font-medium text-slate-900 dark:text-white" title={displayName}>
                              {displayName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(doc.generatedAt).toLocaleDateString()}
                          </span>
                          <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                            <a
                              href={doc.docxUrl}
                              download={displayName}
                              title="Download"
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => {
                                setModalState({ type: 'renameDoc', doc });
                                setRenameInputValue(doc.fileName || doc.templateName);
                              }}
                              title="Rename"
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setModalState({ type: 'copyDoc', doc })}
                              title="Copy to folder"
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setModalState({ type: 'moveDoc', doc })}
                              title="Move to folder"
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                            >
                              <MoveRight className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              title="Delete document"
                              className="rounded p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {!childFolders.length && !currentDocuments.length && (
                      <div className="py-14 text-center text-sm text-slate-500">
                        This folder is empty.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Footer Bar */}
              {activeCompany && (
                <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800">
                  {activeCompany.englishName} · {childFolders.length} folder(s) · {currentDocuments.length} document(s)
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* RENAME / CREATE FOLDER MODAL */}
      {(modalState?.type === 'createFolder' ||
        modalState?.type === 'renameFolder' ||
        modalState?.type === 'renameDoc') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {modalState.type === 'createFolder' && 'New Folder'}
                {modalState.type === 'renameFolder' && 'Rename Folder'}
                {modalState.type === 'renameDoc' && 'Rename Document'}
              </h3>
              <button
                onClick={() => setModalState(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  {modalState.type === 'createFolder' ? 'Folder Name' : 'New Name'}
                </label>
                <Input
                  value={renameInputValue}
                  onChange={(e) => setRenameInputValue(e.target.value)}
                  placeholder={modalState.type === 'createFolder' ? 'e.g. Finance Documents' : 'Enter name'}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (modalState.type === 'createFolder') {
                        handleCreateFolder(renameInputValue);
                      } else if (modalState.type === 'renameFolder') {
                        handleRenameFolder(modalState.folder, renameInputValue);
                      } else {
                        handleRenameDocument(modalState.doc, renameInputValue);
                      }
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalState(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (modalState.type === 'createFolder') {
                      handleCreateFolder(renameInputValue);
                    } else if (modalState.type === 'renameFolder') {
                      handleRenameFolder(modalState.folder, renameInputValue);
                    } else {
                      handleRenameDocument(modalState.doc, renameInputValue);
                    }
                  }}
                >
                  {modalState.type === 'createFolder' ? 'Create Folder' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOVE / COPY TARGET FOLDER PICKER MODAL */}
      {(modalState?.type === 'moveFolder' ||
        modalState?.type === 'moveDoc' ||
        modalState?.type === 'copyDoc') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {modalState.type === 'moveFolder' && `Move "${modalState.folder.name}" to…`}
                {modalState.type === 'moveDoc' &&
                  `Move "${modalState.doc.fileName || modalState.doc.templateName}" to…`}
                {modalState.type === 'copyDoc' &&
                  `Copy "${modalState.doc.fileName || modalState.doc.templateName}" to…`}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Select a target destination folder in this company.
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-1">
              {folders
                .filter((folder) => {
                  const companyId =
                    modalState.type === 'moveFolder'
                      ? modalState.folder.companyId
                      : modalState.doc.companyId;

                  if (folder.companyId !== companyId) return false;
                  if (modalState.type === 'moveFolder' && folder.id === modalState.folder.id) return false;
                  return true;
                })
                .map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      if (modalState.type === 'moveFolder') {
                        handleMoveFolder(modalState.folder.id, folder.id);
                      } else if (modalState.type === 'moveDoc') {
                        handleMoveDocument(modalState.doc.id, folder.id);
                      } else if (modalState.type === 'copyDoc') {
                        handleCopyDocument(modalState.doc.id, folder.id);
                      }
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-amber-400 fill-amber-400/30" />
                    <span className="font-medium">{folder.name}</span>
                  </button>
                ))}
            </div>
            <div className="flex justify-end border-t border-slate-200 p-3 dark:border-slate-800">
              <Button variant="outline" onClick={() => setModalState(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
