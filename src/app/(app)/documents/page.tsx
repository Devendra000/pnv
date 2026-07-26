'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFileApiUrl } from '@/lib/utils';
import { CompanyFolder, Document } from '@/lib/types';
import {
  copyDocumentAction,
  createCompanyFolderAction,
  deleteCompanyFolderAction,
  deleteDocumentAction,
  duplicateCompanyFolderAction,
  listAllCompanyFoldersAction,
  moveCompanyFolderAction,
  moveDocumentAction,
  renameCompanyFolderAction,
  renameDocumentAction,
  setDefaultGenerationFolderAction,
} from '@/lib/actions';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  Eye,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  Grid,
  List as ListIcon,
  MoveRight,
  Plus,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react';

function FolderBranch({
  folders,
  folder,
  activeFolderId,
  expandedFolderIds,
  clipboardState,
  onOpen,
  onToggleExpand,
  onDuplicateFolder,
  onMoveFolder,
  onRenameFolder,
  onDeleteFolder,
  onSetDefaultTarget,
  onPasteHere,
  depth = 0,
}: {
  folders: CompanyFolder[];
  folder: CompanyFolder;
  activeFolderId: string | null;
  expandedFolderIds: Set<string>;
  clipboardState?: ClipboardState;
  onOpen: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  onDuplicateFolder?: (folder: CompanyFolder) => void;
  onMoveFolder?: (folder: CompanyFolder) => void;
  onRenameFolder?: (folder: CompanyFolder) => void;
  onDeleteFolder?: (folder: CompanyFolder) => void;
  onSetDefaultTarget?: (folder: CompanyFolder) => void;
  onPasteHere?: (targetFolderId: string) => void;
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
        className={`group flex w-full items-center justify-between rounded-lg py-1.5 pr-1.5 transition-colors ${
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
            title={folder.name}
            onClick={() => {
              onOpen(folder.id);
              if (hasChildren && !isExpanded) {
                onToggleExpand(folder.id);
              }
            }}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
          >
            <Folder className="h-4 w-4 shrink-0 text-amber-400 fill-amber-400/20" />
            <span className="truncate" title={folder.name}>{folder.name}</span>
            {folder.isDefault && (
              <span title="Default generation folder" className="ml-1 inline-flex shrink-0 items-center gap-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Target className="h-3 w-3" /> Default
              </span>
            )}
          </button>
        </div>

        {/* Hover Action Buttons on Sidebar Folder Item */}
        <div className="hidden items-center gap-0.5 group-hover:flex">
          {clipboardState && onPasteHere && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPasteHere(folder.id);
              }}
              title="Paste into this folder"
              className={`rounded p-1 transition-colors ${
                isActive
                  ? 'text-white hover:bg-blue-700'
                  : 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}

          {onDuplicateFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateFolder(folder);
              }}
              title="Duplicate folder"
              className={`rounded p-1 transition-colors ${
                isActive
                  ? 'text-white hover:bg-blue-700'
                  : 'text-slate-500 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}

          {folder.parentFolderId && onMoveFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveFolder(folder);
              }}
              title="Move folder"
              className={`rounded p-1 transition-colors ${
                isActive
                  ? 'text-white hover:bg-blue-700'
                  : 'text-slate-500 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <MoveRight className="h-3.5 w-3.5" />
            </button>
          )}

          {onRenameFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRenameFolder(folder);
              }}
              title="Rename folder"
              className={`rounded p-1 transition-colors ${
                isActive
                  ? 'text-white hover:bg-blue-700'
                  : 'text-slate-500 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}

          {onSetDefaultTarget && folder.parentFolderId && !folder.isDefault && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetDefaultTarget(folder);
              }}
              title="Set as default generation folder"
              className={`rounded p-1 transition-colors ${
                isActive
                  ? 'text-white hover:bg-blue-700'
                  : 'text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950'
              }`}
            >
              <Target className="h-3.5 w-3.5" />
            </button>
          )}

          {folder.parentFolderId && !folder.isDefault && onDeleteFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder);
              }}
              title="Delete folder"
              className={`rounded p-1 transition-colors ${
                isActive
                  ? 'text-white hover:bg-red-700'
                  : 'text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
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
              clipboardState={clipboardState}
              onOpen={onOpen}
              onToggleExpand={onToggleExpand}
              onDuplicateFolder={onDuplicateFolder}
              onMoveFolder={onMoveFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onPasteHere={onPasteHere}
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
  | { type: 'deleteFolder'; folder: CompanyFolder; subfolderCount: number; documentCount: number }
  | { type: 'deleteDoc'; doc: Document }
  | null;

type ClipboardState =
  | { action: 'moveFolder'; folder: CompanyFolder }
  | { action: 'moveDoc'; doc: Document }
  | { action: 'copyDoc'; doc: Document }
  | null;

export default function DocumentsPage() {
  const { companies, documents, loading, refreshData } = useAppDataContext();
  const [folders, setFolders] = useState<CompanyFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [explorerMode, setExplorerMode] = useState<'folders' | 'documents'>('folders');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [modalState, setModalState] = useState<ModalState>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [targetFolderSearch, setTargetFolderSearch] = useState('');
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // Helper: compute full path string for a folder
  const getFolderPathString = (folder: CompanyFolder, allFolders: CompanyFolder[]): string => {
    const parts: string[] = [];
    let curr: CompanyFolder | null = folder;
    while (curr) {
      parts.unshift(curr.name);
      curr = allFolders.find((f) => f.id === curr?.parentFolderId) || null;
    }
    return parts.join(' / ');
  };

  // Helper: get all ancestor folder IDs for expanding sidebar tree
  const getFolderAncestors = (folderId: string, allFolders: CompanyFolder[]): string[] => {
    const ancestors: string[] = [];
    let curr = allFolders.find((f) => f.id === folderId);
    while (curr && curr.parentFolderId) {
      ancestors.push(curr.parentFolderId);
      curr = allFolders.find((f) => f.id === curr?.parentFolderId);
    }
    return ancestors;
  };

  // Helper: check if targetId is folderId or a descendant of folderId
  const isDescendantOrSelf = (
    folderId: string,
    targetId: string,
    allFolders: CompanyFolder[]
  ): boolean => {
    if (folderId === targetId) return true;
    let curr = allFolders.find((f) => f.id === targetId);
    while (curr) {
      if (curr.parentFolderId === folderId) return true;
      curr = allFolders.find((f) => f.id === curr?.parentFolderId);
    }
    return false;
  };

  // Helper: build tree-ordered folders list with depth and full path string
  const getTreeOrderedFolders = (
    companyId: string,
    allFolders: CompanyFolder[],
    excludedFolderId?: string
  ): { folder: CompanyFolder; depth: number; pathString: string }[] => {
    const result: { folder: CompanyFolder; depth: number; pathString: string }[] = [];

    const addBranch = (parentFolderId: string | null, depth: number) => {
      const children = allFolders.filter(
        (f) => f.companyId === companyId && f.parentFolderId === parentFolderId
      );
      for (const child of children) {
        if (excludedFolderId && isDescendantOrSelf(excludedFolderId, child.id, allFolders)) {
          continue;
        }
        const pathString = getFolderPathString(child, allFolders);
        result.push({ folder: child, depth, pathString });
        addBranch(child.id, depth + 1);
      }
    };

    addBranch(null, 0);
    return result;
  };

  const reloadFolders = async () => setFolders(await listAllCompanyFoldersAction());

  useEffect(() => {
    if (!companies.length) return;
    listAllCompanyFoldersAction()
      .then(setFolders)
      .catch((error) => console.error('Unable to load document folders:', error));
  }, [companies.length]);

  // Restore activeFolderId, viewMode, and explorerMode from sessionStorage on mount
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
      const savedExplorerMode = sessionStorage.getItem('docgen_explorer_mode') as 'folders' | 'documents' | null;
      if (savedExplorerMode === 'folders' || savedExplorerMode === 'documents') {
        setExplorerMode(savedExplorerMode);
      }
      const savedCardSize = sessionStorage.getItem('docgen_card_size') as any;
      if (savedCardSize && ['small', 'medium', 'large', 'xlarge'].includes(savedCardSize)) {
        setCardSize(savedCardSize);
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

  const changeExplorerMode = (mode: 'folders' | 'documents') => {
    setExplorerMode(mode);
    try {
      sessionStorage.setItem('docgen_explorer_mode', mode);
    } catch (e) {
      console.error('Failed to write explorer mode to sessionStorage:', e);
    }
  };

  const changeCardSize = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
    setCardSize(size);
    try {
      sessionStorage.setItem('docgen_card_size', size);
    } catch (e) {
      console.error('Failed to write card size to sessionStorage:', e);
    }
  };

  const handleLocateDocumentInFolder = (doc: Document) => {
    let targetFolderId = doc.folderId;
    if (!targetFolderId) {
      const rootFolder = rootFolders.find((f) => f.companyId === doc.companyId);
      targetFolderId = rootFolder ? rootFolder.id : null;
    }

    if (targetFolderId) {
      const parentIds = getFolderAncestors(targetFolderId, folders);
      setExpandedFolderIds((prev) => {
        const next = new Set(prev);
        parentIds.forEach((id) => next.add(id));
        next.add(targetFolderId!);
        return next;
      });
      changeActiveFolderId(targetFolderId);
    } else {
      changeActiveFolderId(null);
    }
    changeExplorerMode('folders');
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

  const [clipboardState, setClipboardState] = useState<ClipboardState>(null);
  const [explorerSearchQuery, setExplorerSearchQuery] = useState('');

  const activeFolder = folders.find((folder) => folder.id === activeFolderId) || null;
  const activeCompany = companies.find((company) => company.id === activeFolder?.companyId) || null;

  const rootFolders = useMemo(() => {
    const list = folders.filter((folder) => !folder.parentFolderId);
    if (!explorerSearchQuery.trim()) return list;
    const q = explorerSearchQuery.toLowerCase().trim();
    return list.filter((f) => {
      const company = companies.find((c) => c.id === f.companyId);
      const name = company?.englishName || f.name;
      return name.toLowerCase().includes(q);
    });
  }, [folders, companies, explorerSearchQuery]);

  const childFolders = useMemo(() => {
    const list = folders.filter((folder) => folder.parentFolderId === activeFolderId);
    if (!explorerSearchQuery.trim()) return list;
    const q = explorerSearchQuery.toLowerCase().trim();
    return list.filter((f) => f.name.toLowerCase().includes(q));
  }, [activeFolderId, folders, explorerSearchQuery]);

  const currentDocuments = useMemo(() => {
    if (!activeFolder) return [];
    const list = documents.filter(
      (document) => document.companyId === activeFolder.companyId && document.folderId === activeFolder.id
    );
    if (!explorerSearchQuery.trim()) return list;
    const q = explorerSearchQuery.toLowerCase().trim();
    return list.filter((d) => {
      const name = d.fileName || d.templateName;
      return name.toLowerCase().includes(q) || d.templateName.toLowerCase().includes(q);
    });
  }, [activeFolder, documents, explorerSearchQuery]);

  const rootDocuments = useMemo(() => documents.filter((document) => !document.folderId), [documents]);

  const handleDuplicateFolder = async (folder: CompanyFolder) => {
    try {
      await duplicateCompanyFolderAction(folder.id);
      await reloadFolders();
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to duplicate folder.');
    }
  };

  const handlePasteHereToFolder = async (targetFolderId: string) => {
    if (!clipboardState) return;
    try {
      if (clipboardState.action === 'moveFolder') {
        if (isDescendantOrSelf(clipboardState.folder.id, targetFolderId, folders)) {
          alert('Cannot move a folder into itself or its own subfolder.');
          return;
        }
        await moveCompanyFolderAction(clipboardState.folder.id, targetFolderId);
      } else if (clipboardState.action === 'moveDoc') {
        await moveDocumentAction(clipboardState.doc.id, targetFolderId);
      } else if (clipboardState.action === 'copyDoc') {
        await copyDocumentAction(clipboardState.doc.id, targetFolderId);
      }
      setClipboardState(null);
      await reloadFolders();
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Paste operation failed.');
    }
  };

  const handlePasteHere = async () => {
    if (!activeFolder) return;
    await handlePasteHereToFolder(activeFolder.id);
  };

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

  const countFolderContents = (targetFolderId: string) => {
    let subfolderCount = 0;
    let documentCount = 0;

    const traverse = (folderId: string) => {
      const docsInFolder = documents.filter((d) => d.folderId === folderId);
      documentCount += docsInFolder.length;

      const children = folders.filter((f) => f.parentFolderId === folderId);
      subfolderCount += children.length;

      for (const child of children) {
        traverse(child.id);
      }
    };

    traverse(targetFolderId);
    return { subfolderCount, documentCount };
  };

  const handleSetDefaultTarget = async (folder: CompanyFolder) => {
    try {
      const updated = await setDefaultGenerationFolderAction(folder.id);
      setFolders(updated);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to set default generation folder.');
    }
  };

  const promptDeleteFolder = (folder: CompanyFolder) => {
    const isRoot = !folder.parentFolderId;
    if (isRoot) {
      alert('To remove a root company folder, please delete the company from the Companies page.');
      return;
    }
    if (folder.isDefault) {
      alert('The default generation target folder cannot be deleted.');
      return;
    }

    const { subfolderCount, documentCount } = countFolderContents(folder.id);
    setModalState({
      type: 'deleteFolder',
      folder,
      subfolderCount,
      documentCount,
    });
  };

  const confirmDeleteFolder = async (folder: CompanyFolder) => {
    try {
      await deleteCompanyFolderAction(folder.id);
      if (activeFolderId === folder.id) {
        changeActiveFolderId(folder.parentFolderId || null);
      }
      setModalState(null);
      await reloadFolders();
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete folder.');
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

  const promptDeleteDocument = (doc: Document) => {
    setModalState({ type: 'deleteDoc', doc });
  };

  const confirmDeleteDocument = async (doc: Document) => {
    try {
      await deleteDocumentAction(doc.id);
      setModalState(null);
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete document.');
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
    <div className="flex min-h-full flex-col bg-slate-50/60 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6 pt-4 pb-6 space-y-6">
        <PageHeader
          title="Document Manager"
          description="Browse, organize, rename, move, and copy company documents"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle: Folder View vs All Documents List */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
                <button
                  onClick={() => changeExplorerMode('folders')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    explorerMode === 'folders'
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  <span>Folder View</span>
                </button>
                <button
                  onClick={() => changeExplorerMode('documents')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    explorerMode === 'documents'
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>All Documents List</span>
                </button>
              </div>

              <Link href="/documents/generate">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Generate document
                </Button>
              </Link>
            </div>
          }
        />

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading documents…</p>
        ) : explorerMode === 'documents' ? (
          /* All Documents List Mode */
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search documents by name, template, or company..."
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.englishName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-[minmax(0,1.2fr)_140px_160px_175px_160px] border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950">
                <span>Document Name</span>
                <span>Company</span>
                <span>Folder Location</span>
                <span>Generated Date</span>
                <span className="text-right">Actions</span>
              </div>

              {(() => {
                const filteredDocs = documents.filter((doc) => {
                  if (companyFilter !== 'ALL' && doc.companyId !== companyFilter) return false;
                  if (!docSearchQuery.trim()) return true;
                  const q = docSearchQuery.toLowerCase().trim();
                  const name = doc.fileName || doc.templateName;
                  return (
                    name.toLowerCase().includes(q) ||
                    doc.templateName.toLowerCase().includes(q) ||
                    doc.companyName.toLowerCase().includes(q)
                  );
                });

                if (filteredDocs.length === 0) {
                  return (
                    <div className="py-16 text-center text-sm text-slate-500">
                      No documents found matching your criteria.
                    </div>
                  );
                }

                return filteredDocs.map((doc) => {
                  const displayName = doc.fileName || `${doc.templateName}.docx`;
                  const folderObj = folders.find((f) => f.id === doc.folderId);
                  const folderPath = folderObj ? getFolderPathString(folderObj, folders) : 'Documents (Root)';
                  return (
                    <div
                      key={doc.id}
                      className="group grid grid-cols-[minmax(0,1.2fr)_140px_160px_175px_160px] items-center border-b border-slate-100 px-4 py-3 text-sm transition-colors hover:bg-blue-50/40 dark:border-slate-800/60 dark:hover:bg-blue-950/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white" title={displayName}>
                            {displayName}
                          </p>
                          <p className="truncate text-xs text-slate-400">{doc.templateName}</p>
                        </div>
                      </div>

                      <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                        {doc.companyName}
                      </span>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400 fill-amber-400/20" />
                        <button
                          onClick={() => handleLocateDocumentInFolder(doc)}
                          className="truncate text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 text-left"
                          title={`Go to folder: ${folderPath}`}
                        >
                          {folderPath}
                        </button>
                      </div>

                      <span className="text-xs text-slate-500">
                        {new Date(doc.generatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>

                      <div className="hidden items-center justify-end gap-0.5 group-hover:flex">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview document"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleLocateDocumentInFolder(doc)}
                          title="Locate in folder"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950"
                        >
                          <FolderSearch className="h-4 w-4" />
                        </button>
                        <a
                          href={getFileApiUrl(doc.docxUrl)}
                          download={displayName}
                          title="Download"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => {
                            setModalState({ type: 'renameDoc', doc });
                            setRenameInputValue(doc.fileName || doc.templateName);
                          }}
                          title="Rename"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setClipboardState({ action: 'copyDoc', doc })}
                          title="Copy document"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setClipboardState({ action: 'moveDoc', doc })}
                          title="Move document"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <MoveRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => promptDeleteDocument(doc)}
                          title="Delete document"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          /* Windows Explorer Folder Tree View */
          <div className="grid w-full h-[calc(100vh-220px)] min-h-[550px] rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[280px_1fr] overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="h-full overflow-y-auto border-b border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950 md:border-b-0 md:border-r">
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
                        clipboardState={clipboardState}
                        onOpen={changeActiveFolderId}
                        onToggleExpand={toggleExpand}
                        onDuplicateFolder={handleDuplicateFolder}
                        onMoveFolder={(f) => setClipboardState({ action: 'moveFolder', folder: f })}
                        onRenameFolder={(f) => {
                          setModalState({ type: 'renameFolder', folder: f });
                          setRenameInputValue(f.name);
                        }}
                        onDeleteFolder={promptDeleteFolder}
                        onSetDefaultTarget={handleSetDefaultTarget}
                        onPasteHere={handlePasteHereToFolder}
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
            <main className="relative flex h-full min-w-0 flex-col overflow-hidden">
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
                  {/* Explorer Search Input */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={explorerSearchQuery}
                      onChange={(e) => setExplorerSearchQuery(e.target.value)}
                      placeholder="Search folders & files…"
                      className="h-8 w-40 pl-8 text-xs md:w-56"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950">
                    {viewMode === 'grid' && (
                      <select
                        value={cardSize}
                        onChange={(e) => changeCardSize(e.target.value as any)}
                        className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-xs focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        title="Folder Card Size"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="xlarge">Extra Large</option>
                      </select>
                    )}

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

                  {activeFolder && activeFolder.parentFolderId && (
                    activeFolder.isDefault ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Default
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefaultTarget(activeFolder)}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                        title="Set current folder as default generation target for new documents"
                      >
                        <Target className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        Set as Default
                      </Button>
                    )
                  )}

                  {clipboardState ? (
                    <Button
                      size="sm"
                      disabled={
                        !activeFolder ||
                        (clipboardState.action === 'moveFolder' &&
                          isDescendantOrSelf(clipboardState.folder.id, activeFolder.id, folders))
                      }
                      onClick={handlePasteHere}
                      className="bg-blue-600 hover:bg-blue-700 font-medium"
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Paste Here
                    </Button>
                  ) : (
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
                  )}
                </div>
              </div>

              {/* Folder & Document Grid/List View */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                {viewMode === 'grid' ? (
                  /* Grid View (Windows Explorer Tile Cards) */
                  <div className="space-y-6">
                    {!activeFolder ? (
                      /* Root View: All Company Folders (Grid) */
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Companies ({rootFolders.length})
                        </p>
                        <div className={
                          cardSize === 'small'
                            ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                            : cardSize === 'large'
                            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
                            : cardSize === 'xlarge'
                            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'
                            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                        }>
                          {rootFolders.map((folder) => {
                            const company = companies.find((item) => item.id === folder.companyId);
                            const folderName = company?.englishName || folder.name;
                            return (
                              <div
                                key={folder.id}
                                className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 transition-all hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-600 dark:hover:bg-blue-950/30 ${
                                  cardSize === 'small'
                                    ? 'p-2.5 min-h-[90px]'
                                    : cardSize === 'large'
                                    ? 'p-6 min-h-[160px]'
                                    : cardSize === 'xlarge'
                                    ? 'p-8 min-h-[220px]'
                                    : 'p-4 min-h-[120px]'
                                }`}
                              >
                                <button
                                  onClick={() => changeActiveFolderId(folder.id)}
                                  className="w-full text-left"
                                  title={folderName}
                                >
                                  <div className="mb-3 flex items-center justify-between">
                                    <Folder className={`text-amber-400 fill-amber-400/30 transition-transform group-hover:scale-105 ${
                                      cardSize === 'small'
                                        ? 'h-6 w-6'
                                        : cardSize === 'large'
                                        ? 'h-16 w-16'
                                        : cardSize === 'xlarge'
                                        ? 'h-24 w-24'
                                        : 'h-10 w-10'
                                    }`} />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Company Root
                                    </span>
                                  </div>
                                  <p className={`truncate text-slate-900 dark:text-white ${
                                    cardSize === 'small'
                                      ? 'text-xs font-medium'
                                      : cardSize === 'large'
                                      ? 'text-base font-bold'
                                      : cardSize === 'xlarge'
                                      ? 'text-xl font-bold'
                                      : 'text-sm font-semibold'
                                  }`} title={folderName}>{folderName}</p>
                                  <p className="mt-1 text-xs text-slate-500">Company documents folder</p>
                                </button>

                                {/* Hover Actions Bar */}
                                <div className="mt-2 hidden flex-wrap items-center justify-end gap-1 border-t border-slate-200/60 pt-1.5 group-hover:flex dark:border-slate-800">
                                  <button
                                    onClick={() => {
                                      setModalState({ type: 'renameFolder', folder });
                                      setRenameInputValue(folderName);
                                    }}
                                    title="Rename folder"
                                    className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                      cardSize === 'small' ? 'p-1' : 'p-1.5'
                                    }`}
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
                      </div>
                    ) : (
                      /* Subfolder View: Child Folders & Documents Grid */
                      <>
                        {/* Folders Section */}
                        {childFolders.length > 0 && (
                          <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Folders ({childFolders.length})
                            </p>
                            <div className={
                              cardSize === 'small'
                                ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                                : cardSize === 'large'
                                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
                                : cardSize === 'xlarge'
                                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'
                                : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                            }>
                              {childFolders.map((folder) => (
                                <div
                                  key={folder.id}
                                  className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 transition-all hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-600 dark:hover:bg-blue-950/30 ${
                                    cardSize === 'small'
                                      ? 'p-2.5 min-h-[90px]'
                                      : cardSize === 'large'
                                      ? 'p-6 min-h-[160px]'
                                      : cardSize === 'xlarge'
                                      ? 'p-8 min-h-[220px]'
                                      : 'p-4 min-h-[120px]'
                                  }`}
                                >
                                  <button
                                    onClick={() => changeActiveFolderId(folder.id)}
                                    className="w-full text-left"
                                    title={folder.name}
                                  >
                                    <div className="mb-3 flex items-center justify-between">
                                      <Folder className={`text-amber-400 fill-amber-400/30 transition-transform group-hover:scale-105 ${
                                        cardSize === 'small'
                                          ? 'h-6 w-6'
                                          : cardSize === 'large'
                                          ? 'h-16 w-16'
                                          : cardSize === 'xlarge'
                                          ? 'h-24 w-24'
                                          : 'h-10 w-10'
                                      }`} />
                                      {folder.isDefault && (
                                        <span title="Default generation target folder" className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                          <Target className="h-3 w-3" /> Default
                                        </span>
                                      )}
                                    </div>
                                    <p className={`truncate text-slate-900 dark:text-white ${
                                      cardSize === 'small'
                                        ? 'text-xs font-medium'
                                        : cardSize === 'large'
                                        ? 'text-base font-bold'
                                        : cardSize === 'xlarge'
                                        ? 'text-xl font-bold'
                                        : 'text-sm font-semibold'
                                    }`} title={folder.name}>
                                      {folder.name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {new Date(folder.updatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </p>
                                  </button>

                                  <div className="mt-2 hidden flex-wrap items-center justify-end gap-1 border-t border-slate-200/60 pt-1.5 group-hover:flex dark:border-slate-800">
                                    <button
                                      onClick={() => handleDuplicateFolder(folder)}
                                      title="Duplicate folder"
                                      className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                        cardSize === 'small' ? 'p-1' : 'p-1.5'
                                      }`}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setModalState({ type: 'renameFolder', folder });
                                        setRenameInputValue(folder.name);
                                      }}
                                      title="Rename"
                                      className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                        cardSize === 'small' ? 'p-1' : 'p-1.5'
                                      }`}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setClipboardState({ action: 'moveFolder', folder })}
                                      title="Move folder"
                                      className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                        cardSize === 'small' ? 'p-1' : 'p-1.5'
                                      }`}
                                    >
                                      <MoveRight className="h-3.5 w-3.5" />
                                    </button>
                                    {!folder.isDefault && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetDefaultTarget(folder);
                                        }}
                                        title="Set as default generation folder"
                                        className={`rounded-lg text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
                                      >
                                        <Target className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {!folder.isDefault && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          promptDeleteFolder(folder);
                                        }}
                                        title="Delete folder"
                                        className={`rounded-lg text-slate-600 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
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
                            <div className={
                              cardSize === 'small'
                                ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                                : cardSize === 'large'
                                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
                                : cardSize === 'xlarge'
                                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'
                                : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                            }>
                              {currentDocuments.map((doc) => {
                                const displayName = doc.fileName || `${doc.templateName}.docx`;
                                return (
                                  <div
                                    key={doc.id}
                                    className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white transition-all hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600 ${
                                      cardSize === 'small'
                                        ? 'p-2.5 min-h-[90px]'
                                        : cardSize === 'large'
                                        ? 'p-6 min-h-[160px]'
                                        : cardSize === 'xlarge'
                                        ? 'p-8 min-h-[220px]'
                                        : 'p-4 min-h-[120px]'
                                    }`}
                                  >
                                    <div className="w-full text-left">
                                      <div className="mb-3 flex items-start justify-between">
                                        <div className={`inline-flex items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 ${
                                          cardSize === 'small'
                                            ? 'h-6 w-6'
                                            : cardSize === 'large'
                                            ? 'h-14 w-14'
                                            : cardSize === 'xlarge'
                                            ? 'h-20 w-20'
                                            : 'h-10 w-10'
                                        }`}>
                                          <FileText className={
                                            cardSize === 'small'
                                              ? 'h-3.5 w-3.5'
                                              : cardSize === 'large'
                                              ? 'h-8 w-8'
                                              : cardSize === 'xlarge'
                                              ? 'h-12 w-12'
                                              : 'h-5 w-5'
                                          } />
                                        </div>
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                                          DOCX
                                        </span>
                                      </div>
                                      <p className={`truncate text-slate-900 dark:text-white ${
                                        cardSize === 'small'
                                          ? 'text-xs font-medium'
                                          : cardSize === 'large'
                                          ? 'text-base font-bold'
                                          : cardSize === 'xlarge'
                                          ? 'text-xl font-bold'
                                          : 'text-sm font-semibold'
                                      }`} title={displayName}>
                                        {displayName}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {new Date(doc.generatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </p>
                                    </div>

                                    <div className="mt-2 hidden flex-wrap items-center justify-end gap-1 border-t border-slate-200/60 pt-1.5 group-hover:flex dark:border-slate-800">
                                      <button
                                        onClick={() => setPreviewDoc(doc)}
                                        title="Preview document"
                                        className={`rounded-lg text-slate-600 hover:bg-blue-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      <a
                                        href={getFileApiUrl(doc.docxUrl)}
                                        download={displayName}
                                        title="Download"
                                        className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                      <button
                                        onClick={() => {
                                          setModalState({ type: 'renameDoc', doc });
                                          setRenameInputValue(doc.fileName || doc.templateName);
                                        }}
                                        title="Rename"
                                        className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setClipboardState({ action: 'copyDoc', doc })}
                                        title="Copy document"
                                        className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setClipboardState({ action: 'moveDoc', doc })}
                                        title="Move document"
                                        className={`rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
                                      >
                                        <MoveRight className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => promptDeleteDocument(doc)}
                                        title="Delete document"
                                        className={`rounded-lg text-slate-600 hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950 ${
                                          cardSize === 'small' ? 'p-1' : 'p-1.5'
                                        }`}
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
                      </>
                    )}
                  </div>
                ) : (
                  /* List View (Windows Explorer Details View) */
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-[minmax(0,1fr)_175px_160px] border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                      <span>Name</span>
                      <span>Date</span>
                      <span className="text-right">Actions</span>
                    </div>

                    {!activeFolder ? (
                      /* Root View List */
                      <>
                        {rootFolders.map((folder) => {
                          const company = companies.find((item) => item.id === folder.companyId);
                          const folderName = company?.englishName || folder.name;
                          return (
                            <div
                              key={folder.id}
                              className="group grid grid-cols-[minmax(0,1fr)_175px_160px] items-center border-b px-4 py-3 text-sm transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                            >
                              <button
                                onClick={() => changeActiveFolderId(folder.id)}
                                className="flex min-w-0 items-center gap-2 text-left font-medium text-slate-900 dark:text-white"
                                title={folderName}
                              >
                                <Folder className="h-5 w-5 shrink-0 text-amber-400 fill-amber-400/30" />
                                <span className="truncate" title={folderName}>{folderName}</span>
                                <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                                  Company Root
                                </span>
                              </button>
                              <span className="text-xs text-slate-500">
                                {new Date(folder.updatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                              <div className="hidden items-center justify-end gap-0.5 group-hover:flex">
                                <button
                                  onClick={() => {
                                    setModalState({ type: 'renameFolder', folder });
                                    setRenameInputValue(folderName);
                                  }}
                                  title="Rename folder"
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {rootDocuments.map((doc) => {
                          const displayName = doc.fileName || `${doc.templateName}.docx`;
                          return (
                            <div
                              key={doc.id}
                              className="group grid grid-cols-[minmax(0,1fr)_175px_160px] items-center border-b px-4 py-3 text-sm transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                                <span className="truncate font-medium text-slate-900 dark:text-white" title={displayName}>
                                  {displayName}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(doc.generatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                              <div className="hidden items-center justify-end gap-0.5 group-hover:flex">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  title="Preview document"
                                  className="rounded p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <a
                                  href={getFileApiUrl(doc.docxUrl)}
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
                                  onClick={() => setClipboardState({ action: 'copyDoc', doc })}
                                  title="Copy document"
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setClipboardState({ action: 'moveDoc', doc })}
                                  title="Move document"
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                                >
                                  <MoveRight className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => promptDeleteDocument(doc)}
                                  title="Delete document"
                                  className="rounded p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      /* Subfolder View List */
                      <>
                        {childFolders.map((folder) => (
                          <div
                            key={folder.id}
                            className="group grid grid-cols-[minmax(0,1fr)_175px_160px] items-center border-b px-4 py-3 text-sm transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                          >
                            <button
                              onClick={() => changeActiveFolderId(folder.id)}
                              className="flex min-w-0 items-center gap-2 text-left font-medium text-slate-900 dark:text-white"
                              title={folder.name}
                            >
                              <Folder className="h-5 w-5 shrink-0 text-amber-400 fill-amber-400/30" />
                              <span className="truncate" title={folder.name}>{folder.name}</span>
                              {folder.isDefault && (
                                <span title="Default generation target folder" className="ml-1.5 inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  <Target className="h-3 w-3" /> Default
                                </span>
                              )}
                            </button>
                            <span className="text-xs text-slate-500">
                              {new Date(folder.updatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                            <div className="hidden items-center justify-end gap-0.5 group-hover:flex">
                              <button
                                onClick={() => handleDuplicateFolder(folder)}
                                title="Duplicate folder"
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
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
                                onClick={() => setClipboardState({ action: 'moveFolder', folder })}
                                title="Move folder"
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                              >
                                <MoveRight className="h-4 w-4" />
                              </button>
                              {!folder.isDefault && (
                                <button
                                  onClick={() => handleSetDefaultTarget(folder)}
                                  title="Set as default generation folder"
                                  className="rounded p-1.5 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950"
                                >
                                  <Target className="h-4 w-4" />
                                </button>
                              )}
                              {!folder.isDefault && (
                                <button
                                  onClick={() => promptDeleteFolder(folder)}
                                  title="Delete folder"
                                  className="rounded p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {currentDocuments.map((doc) => {
                          const displayName = doc.fileName || `${doc.templateName}.docx`;
                          return (
                            <div
                              key={doc.id}
                              className="group grid grid-cols-[minmax(0,1fr)_175px_160px] items-center border-b px-4 py-3 text-sm transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                                <span className="truncate font-medium text-slate-900 dark:text-white" title={displayName}>
                                  {displayName}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(doc.generatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                              <div className="hidden items-center justify-end gap-0.5 group-hover:flex">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  title="Preview document"
                                  className="rounded p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <a
                                  href={getFileApiUrl(doc.docxUrl)}
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
                                  onClick={() => setClipboardState({ action: 'copyDoc', doc })}
                                  title="Copy document"
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setClipboardState({ action: 'moveDoc', doc })}
                                  title="Move document"
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-blue-600 dark:hover:bg-slate-800"
                                >
                                  <MoveRight className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => promptDeleteDocument(doc)}
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
                      </>
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

              {/* PASTE FLOATING ACTION BAR (CENTERED IN MAIN EXPLORER PANE) */}
              {clipboardState && (
                <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-blue-300 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md dark:border-blue-900 dark:bg-slate-900/95">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      {clipboardState.action.startsWith('move') ? (
                        <MoveRight className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {clipboardState.action === 'moveFolder' && `Moving folder "${clipboardState.folder.name}"`}
                        {clipboardState.action === 'moveDoc' &&
                          `Moving document "${clipboardState.doc.fileName || clipboardState.doc.templateName}"`}
                        {clipboardState.action === 'copyDoc' &&
                          `Copying document "${clipboardState.doc.fileName || clipboardState.doc.templateName}"`}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeFolder
                          ? `Destination: ${activeFolder.name}`
                          : 'Open a destination folder to paste'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
                    <Button
                      size="sm"
                      disabled={
                        !activeFolder ||
                        (clipboardState.action === 'moveFolder' &&
                          isDescendantOrSelf(clipboardState.folder.id, activeFolder.id, folders))
                      }
                      onClick={handlePasteHere}
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-3.5 h-8 font-medium"
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Paste Here
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setClipboardState(null)}
                      className="text-xs h-8 px-3"
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
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



      {/* DELETE FOLDER CONFIRMATION MODAL */}
      {modalState?.type === 'deleteFolder' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-500">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/80">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Folder?</h3>
                <p className="text-xs text-slate-500">Confirm folder deletion</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">&quot;{modalState.folder.name}&quot;</span>?
              </p>

              <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-3.5 dark:border-red-900/50 dark:bg-red-950/30">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                  Contents to be permanently deleted:
                </p>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                    <span><strong>{modalState.subfolderCount}</strong> subfolder(s) inside</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span><strong>{modalState.documentCount}</strong> document(s) inside</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-slate-500">
                This action cannot be undone. All physical files and database records inside this folder will be deleted.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalState(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => confirmDeleteFolder(modalState.folder)}
              >
                Delete Folder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DOCUMENT CONFIRMATION MODAL */}
      {modalState?.type === 'deleteDoc' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-500">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/80">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Document?</h3>
                <p className="text-xs text-slate-500">Confirm document deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">&quot;{modalState.doc.fileName || `${modalState.doc.templateName}.docx`}&quot;</span>? This document file will be permanently deleted.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalState(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => confirmDeleteDocument(modalState.doc)}
              >
                Delete Document
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}

function DocumentPreviewModal({
  doc,
  onClose,
}: {
  doc: Document;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAndRender() {
      setLoading(true);
      setError(null);
      try {
        const { renderAsync } = await import('docx-preview');
        const fileApiUrl = getFileApiUrl(doc.docxUrl);
        const res = await fetch(fileApiUrl);
        if (!res.ok) throw new Error('Failed to fetch document file.');
        const buffer = await res.arrayBuffer();

        if (containerRef.current && active) {
          containerRef.current.innerHTML = '';
          await renderAsync(buffer, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            experimental: false,
          });
        }
      } catch (err) {
        console.error('Failed to render DOCX preview:', err);
        if (active) setError('Unable to render document preview.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAndRender();
    return () => {
      active = false;
    };
  }, [doc.docxUrl]);

  const displayName = doc.fileName || `${doc.templateName}.docx`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{displayName}</h3>
              <p className="text-xs text-slate-500">
                {doc.companyName} · {doc.templateName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getFileApiUrl(doc.docxUrl)}
              download={displayName}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download DOCX
            </a>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Document Previewer */}
        <div className="relative flex-1 overflow-y-auto bg-slate-100 p-6 dark:bg-slate-950">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                Rendering document preview…
              </p>
            </div>
          )}

          {error ? (
            <div className="py-20 text-center text-red-500">
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (
            <div className="mx-auto flex min-h-full justify-center">
              <div
                ref={containerRef}
                className="w-full max-w-4xl overflow-x-auto rounded-xl bg-white p-6 text-slate-900 shadow-md"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
