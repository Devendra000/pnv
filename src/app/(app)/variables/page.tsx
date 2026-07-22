'use client';

import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Variable } from '@/lib/types';
import { isRuntimeCompanyVariableKey } from '@/lib/companyVariables';
import { useState, useMemo } from 'react';
import { Plus, X, Search } from 'lucide-react';

export default function VariablesPage() {
  const { variables, addVariable, updateVariable, deleteVariable, loading } =
    useAppDataContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newVariable, setNewVariable] = useState<{
    key: string;
    label: string;
    type: Variable['type'];
  }>({
    key: '',
    label: '',
    type: 'text',
  });

  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      if (isRuntimeCompanyVariableKey(v.key)) {
        return false;
      }

      return (
        v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [variables, searchQuery]);

  const handleAdd = () => {
    if (newVariable.key.trim() && newVariable.label.trim()) {
      addVariable({
        key: newVariable.key.trim(),
        label: newVariable.label.trim(),
        type: newVariable.type,
      });
      setNewVariable({ key: '', label: '', type: 'text' });
      setIsAdding(false);
    }
  };

  const handleUpdate = (id: string) => {
    if (newVariable.key.trim() && newVariable.label.trim()) {
      updateVariable(id, {
        key: newVariable.key.trim(),
        label: newVariable.label.trim(),
        type: newVariable.type,
      });
      setEditingId(null);
      setNewVariable({ key: '', label: '', type: 'text' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Template Variables"
        description="Manage variables used in document templates"
        actions={
          !isAdding && !editingId && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Variable
            </Button>
          )
        }
      />

      <div className="max-w-4xl mx-auto p-6">
        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2">
          <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-slate-500 shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Variable' : 'New Variable'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Variable Key (e.g. {"[CompanyName]"}) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newVariable.key}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, key: e.target.value })
                  }
                  placeholder="e.g., CompanyName, RegistrationDate"
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Label / Description <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newVariable.label}
                  onChange={(e) =>
                    setNewVariable({
                      ...newVariable,
                      label: e.target.value,
                    })
                  }
                  placeholder="What this variable represents"
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Data Type
                </label>
                <select
                  value={newVariable.type}
                  onChange={(e) =>
                    setNewVariable({
                      ...newVariable,
                      type: e.target.value as Variable['type'],
                    })
                  }
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="list">List</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editingId) {
                      handleUpdate(editingId);
                    } else {
                      handleAdd();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {editingId ? 'Update' : 'Create'} Variable
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewVariable({
                      key: '',
                      label: '',
                      type: 'text',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Variables List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading variables...</div>
          ) : filteredVariables.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <p className="text-slate-500">
                {searchQuery
                  ? 'No variables found matching your search'
                  : 'No variables yet. Create one to get started!'}
              </p>
            </div>
          ) : (
            filteredVariables.map((variable) => (
              <div
                key={variable.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {variable.key}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Type: <span className="font-mono">{variable.type}</span>
                    </p>
                    {variable.label && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        {variable.label}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setEditingId(variable.id);
                        setNewVariable({
                          key: variable.key,
                          label: variable.label,
                          type: variable.type,
                        });
                        setIsAdding(false);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => deleteVariable(variable.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
