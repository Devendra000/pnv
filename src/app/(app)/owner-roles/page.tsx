'use client';

import { useState, useMemo } from 'react';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Search, Edit2, Trash2, Users } from 'lucide-react';

export default function OwnerRolesPage() {
  const {
    ownerRoles,
    addOwnerRole,
    updateOwnerRole,
    deleteOwnerRole,
    loading,
  } = useAppDataContext();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Role state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');

  // Filtered roles by search
  const filteredRoles = useMemo(() => {
    return ownerRoles.filter((r) => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ownerRoles, searchQuery]);

  const handleSaveRole = () => {
    if (!roleName.trim()) return;

    if (editingId) {
      updateOwnerRole(editingId, roleName.trim());
    } else {
      addOwnerRole(roleName.trim());
    }

    setEditingId(null);
    setIsAdding(false);
    setRoleName('');
  };

  const startEdit = (role: (typeof ownerRoles)[0]) => {
    setEditingId(role.id);
    setRoleName(role.name);
    setIsAdding(false);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Owner Types"
        description="Manage the different titles and roles for company owners (e.g. Adhakshya, Sadasya)."
        actions={
          <Button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setRoleName('');
            }}
            className="bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"
            disabled={isAdding}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Owner Type
          </Button>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        
        {/* Header / Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search owner types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30 dark:bg-slate-950/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
            
            {/* Add / Edit Form Card */}
            {(isAdding || editingId) && (
              <div className="rounded-xl border border-primary/20 dark:border-primary/50 bg-primary/10 dark:bg-primary/10 p-5 shadow-sm transition-all h-full flex flex-col gap-4">
                <div className="flex items-center justify-between shrink-0">
                  <h3 className="font-semibold text-primary dark:text-primary flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {editingId ? 'Edit Type' : 'New Type'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 rounded-full"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <Input
                    autoFocus
                    placeholder="e.g. अध्यक्ष"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="bg-white dark:bg-slate-950 border-primary/20 dark:border-primary/50 focus-visible:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRole();
                      if (e.key === 'Escape') {
                        setIsAdding(false);
                        setEditingId(null);
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end shrink-0">
                  <Button 
                    size="sm"
                    onClick={handleSaveRole}
                    className="bg-primary hover:bg-primary/90 text-white"
                    disabled={!roleName.trim()}
                  >
                    Save Type
                  </Button>
                </div>
              </div>
            )}

            {/* List Cards */}
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:border-primary/30 dark:hover:border-primary/70 hover:shadow-md min-h-[140px]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                      {role.name}
                    </h3>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/30 rounded-full transition-colors"
                      onClick={() => startEdit(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this owner type?')) {
                          deleteOwnerRole(role.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                    <Users className="h-3 w-3" />
                    Owner Type
                  </span>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {filteredRoles.length === 0 && !isAdding && !editingId && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No Owner Types Found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
                  {searchQuery ? 'Try adjusting your search query.' : 'Add your first owner type to get started.'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setIsAdding(true)}
                    className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Owner Type
                  </Button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
