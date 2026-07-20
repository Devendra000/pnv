'use client';

import { useState, useMemo } from 'react';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Search } from 'lucide-react';

export default function ObjectivesPage() {
  const { objectives, addObjective, updateObjective, deleteObjective } =
    useAppDataContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newObjective, setNewObjective] = useState({
    name: '',
    description: '',
  });

  const filteredObjectives = useMemo(() => {
    return objectives.filter(
      (o) =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [objectives, searchQuery]);

  const handleAdd = () => {
    if (newObjective.name.trim()) {
      addObjective({
        id: `tmpl-obj-${Date.now()}`,
        name: newObjective.name,
        description: newObjective.description,
        order: objectives.length + 1,
      });
      setNewObjective({ name: '', description: '' });
      setIsAdding(false);
    }
  };

  const handleUpdate = (id: string) => {
    updateObjective(id, newObjective);
    setEditingId(null);
    setNewObjective({ name: '', description: '' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Business Objectives"
        description="Manage business objective templates for companies"
        actions={
          !isAdding && !editingId && (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Objective
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
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="mb-6 bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Objective' : 'New Objective'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Objective Name <span className="text-primary">*</span>
                </label>
                <Input
                  value={newObjective.name}
                  onChange={(e) =>
                    setNewObjective({ ...newObjective, name: e.target.value })
                  }
                  placeholder="e.g., Increase Revenue Growth"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={newObjective.description}
                  onChange={(e) =>
                    setNewObjective({
                      ...newObjective,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of the objective"
                  className="w-full h-24 px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
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
                  {editingId ? 'Update' : 'Create'} Objective
                </Button>
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewObjective({ name: '', description: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Objectives List */}
        <div className="space-y-3">
          {filteredObjectives.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No objectives found matching your search' : 'No objectives yet. Create one to get started!'}
              </p>
            </div>
          ) : (
            filteredObjectives.map((objective) => (
              <div
                key={objective.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {objective.name}
                    </h3>
                    {objective.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {objective.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => {
                        setEditingId(objective.id);
                        setNewObjective({
                          name: objective.name,
                          description: objective.description,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => deleteObjective(objective.id)}
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
