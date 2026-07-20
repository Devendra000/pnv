'use client';

import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Variable } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Plus, X, Search } from 'lucide-react';

export default function VariablesPage() {
  const { variables, addVariable, updateVariable, deleteVariable } =
    useAppDataContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newVariable, setNewVariable] = useState({
    name: '',
    description: '',
    dataType: 'text' as const,
  });

  const filteredVariables = useMemo(() => {
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [variables, searchQuery]);

  const handleAdd = () => {
    if (newVariable.name.trim()) {
      addVariable({
        id: `var-${Date.now()}`,
        ...newVariable,
      });
      setNewVariable({ name: '', description: '', dataType: 'text' });
      setIsAdding(false);
    }
  };

  const handleUpdate = (id: string) => {
    updateVariable(id, newVariable);
    setEditingId(null);
    setNewVariable({ name: '', description: '', dataType: 'text' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Template Variables"
        description="Manage variables used in document templates"
        actions={
          !isAdding && !editingId && (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
        <div className="mb-6 flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="mb-6 bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Variable' : 'New Variable'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Variable Name <span className="text-primary">*</span>
                </label>
                <Input
                  value={newVariable.name}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, name: e.target.value })
                  }
                  placeholder="e.g., CompanyName, RegistrationNumber"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <Input
                  value={newVariable.description}
                  onChange={(e) =>
                    setNewVariable({
                      ...newVariable,
                      description: e.target.value,
                    })
                  }
                  placeholder="What this variable represents"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Data Type
                </label>
                <select
                  value={newVariable.dataType}
                  onChange={(e) =>
                    setNewVariable({
                      ...newVariable,
                      dataType: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {editingId ? 'Update' : 'Create'} Variable
                </Button>
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewVariable({
                      name: '',
                      description: '',
                      dataType: 'text',
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
          {filteredVariables.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No variables found matching your search' : 'No variables yet. Create one to get started!'}
              </p>
            </div>
          ) : (
            filteredVariables.map((variable) => (
              <div
                key={variable.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {variable.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: <span className="font-mono">{variable.dataType}</span>
                    </p>
                    {variable.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {variable.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => {
                        setEditingId(variable.id);
                        setNewVariable({
                          name: variable.name,
                          description: variable.description,
                          dataType: variable.dataType,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
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
