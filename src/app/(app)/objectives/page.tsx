'use client';

import { useState, useMemo } from 'react';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Search } from 'lucide-react';

export default function ObjectivesPage() {
  const { objectives, addObjective, updateObjective, deleteObjective, loading } =
    useAppDataContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newObjectiveText, setNewObjectiveText] = useState('');

  const filteredObjectives = useMemo(() => {
    return objectives.filter((o) =>
      o.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [objectives, searchQuery]);

  const handleAdd = () => {
    if (newObjectiveText.trim()) {
      addObjective({
        text: newObjectiveText.trim(),
      });
      setNewObjectiveText('');
      setIsAdding(false);
    }
  };

  const handleUpdate = (id: string) => {
    if (newObjectiveText.trim()) {
      updateObjective(id, { text: newObjectiveText.trim() });
      setEditingId(null);
      setNewObjectiveText('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Business Objectives"
        description="Manage business objective templates for companies"
        actions={
          !isAdding && !editingId && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
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
        <div className="mb-6 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2">
          <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-slate-500 shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Objective' : 'New Objective'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Objective Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newObjectiveText}
                  onChange={(e) => setNewObjectiveText(e.target.value)}
                  placeholder="e.g., To carry on the business of general trading..."
                  required
                  className="w-full h-28 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {editingId ? 'Update' : 'Create'} Objective
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewObjectiveText('');
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
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading objectives...</div>
          ) : filteredObjectives.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <p className="text-slate-500">
                {searchQuery
                  ? 'No objectives found matching your search'
                  : 'No objectives yet. Create one to get started!'}
              </p>
            </div>
          ) : (
            filteredObjectives.map((objective) => (
              <div
                key={objective.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {objective.text}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setEditingId(objective.id);
                        setNewObjectiveText(objective.text);
                        setIsAdding(false);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
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
