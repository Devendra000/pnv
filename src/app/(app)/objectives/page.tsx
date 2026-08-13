'use client';

import { useState, useMemo } from 'react';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Search, Tag, FolderPlus, Edit2, Trash2 } from 'lucide-react';

export default function ObjectivesPage() {
  const {
    objectiveCategories,
    objectives,
    addObjectiveCategory,
    updateObjectiveCategory,
    deleteObjectiveCategory,
    addObjective,
    updateObjective,
    deleteObjective,
    loading,
  } = useAppDataContext();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Objective state
  const [isAddingObj, setIsAddingObj] = useState(false);
  const [editingObjId, setEditingObjId] = useState<string | null>(null);
  const [objectiveText, setObjectiveText] = useState('');
  const [objectiveCatId, setObjectiveCatId] = useState<string>('');

  // Category management state
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Filtered objectives by search and category
  const filteredObjectives = useMemo(() => {
    return objectives.filter((o) => {
      const matchesCategory =
        selectedCategoryId === 'ALL' || o.categoryId === selectedCategoryId;
      const matchesSearch =
        o.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.categoryName && o.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [objectives, selectedCategoryId, searchQuery]);

  const handleSaveObjective = () => {
    if (!objectiveText.trim()) return;

    if (editingObjId) {
      updateObjective(editingObjId, {
        text: objectiveText.trim(),
        categoryId: objectiveCatId || null,
      });
    } else {
      addObjective({
        text: objectiveText.trim(),
        categoryId: objectiveCatId || null,
      });
    }

    setEditingObjId(null);
    setIsAddingObj(false);
    setObjectiveText('');
    setObjectiveCatId('');
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) return;

    if (editingCatId) {
      updateObjectiveCategory(editingCatId, {
        name: catName.trim(),
        description: catDesc.trim() || undefined,
      });
    } else {
      addObjectiveCategory({
        name: catName.trim(),
        description: catDesc.trim() || undefined,
      });
    }

    setEditingCatId(null);
    setIsAddingCat(false);
    setCatName('');
    setCatDesc('');
  };

  const startEditObjective = (obj: (typeof objectives)[0]) => {
    setEditingObjId(obj.id);
    setObjectiveText(obj.text);
    setObjectiveCatId(obj.categoryId || '');
    setIsAddingObj(false);
  };

  const startEditCategory = (cat: (typeof objectiveCategories)[0]) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setIsAddingCat(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Business Objectives"
        description="Manage government-classified business objectives and industry categories"
        actions={
          <div className="flex gap-2">
            {!isAddingCat && !editingCatId && (
              <Button
                variant="outline"
                className="border-slate-300 dark:border-slate-700 font-medium"
                onClick={() => setIsAddingCat(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Category
              </Button>
            )}
            {!isAddingObj && !editingObjId && (
              <Button
                className="bg-primary hover:bg-primary/90 text-white font-medium"
                onClick={() => {
                  setIsAddingObj(true);
                  setObjectiveCatId(selectedCategoryId !== 'ALL' ? selectedCategoryId : '');
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Objective
              </Button>
            )}
          </div>
        }
      />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-sm">
            <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search objectives or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-slate-500 shadow-none focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Slider/Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Government Objective Categories
            </h3>
            <span className="text-xs text-slate-400">
              {objectiveCategories.length} Categories
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategoryId === 'ALL'
                  ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50'
              }`}
            >
              <span>All Categories</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {objectives.length}
              </span>
            </button>

            {objectiveCategories.map((cat) => {
              const catObjCount = objectives.filter((o) => o.categoryId === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div key={cat.id} className="relative group flex items-center">
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary/50'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 opacity-70" />
                    <span>{cat.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {catObjCount}
                    </span>
                  </button>
                  <div className="hidden group-hover:flex items-center gap-1 ml-1">
                    <button
                      onClick={() => startEditCategory(cat)}
                      title="Edit Category"
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/100 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this objective category?')) {
                          deleteObjectiveCategory(cat.id);
                        }
                      }}
                      title="Delete Category"
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Add/Edit Modal/Form */}
        {(isAddingCat || editingCatId) && (
          <div className="bg-white dark:bg-slate-900 border border-primary/30 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              {editingCatId ? 'Edit Category' : 'Create New Category'}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Hotel, Tourism & Hospitality"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description (Optional)
                </label>
                <Input
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="e.g. Hotels, resorts, travel agencies..."
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingCat(false);
                  setEditingCatId(null);
                  setCatName('');
                  setCatDesc('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCategory}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {editingCatId ? 'Update Category' : 'Create Category'}
              </Button>
            </div>
          </div>
        )}

        {/* Objective Add/Edit Form */}
        {(isAddingObj || editingObjId) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">
              {editingObjId ? 'Edit Business Objective' : 'New Business Objective'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Category
                </label>
                <select
                  value={objectiveCatId}
                  onChange={(e) => setObjectiveCatId(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- No Category (General) --</option>
                  {objectiveCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Objective Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={objectiveText}
                  onChange={(e) => setObjectiveText(e.target.value)}
                  placeholder="e.g. To operate, manage, and establish star-tier hotel and resort facilities..."
                  required
                  className="w-full h-28 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveObjective}
                  className="bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  {editingObjId ? 'Update Objective' : 'Create Objective'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingObj(false);
                    setEditingObjId(null);
                    setObjectiveText('');
                    setObjectiveCatId('');
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
            <div className="text-center py-12 text-slate-500">Loading objectives...</div>
          ) : filteredObjectives.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-base">
                {searchQuery || selectedCategoryId !== 'ALL'
                  ? 'No objectives found matching your selected category or search term.'
                  : 'No objectives found. Create one to get started!'}
              </p>
            </div>
          ) : (
            filteredObjectives.map((objective) => (
              <div
                key={objective.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/50 transition-all shadow-sm group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {objective.categoryName && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary border border-primary/20 dark:border-primary/40">
                        <Tag className="w-3 h-3" />
                        {objective.categoryName}
                      </span>
                    )}
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {objective.text}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => startEditObjective(objective)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this objective?')) {
                          deleteObjective(objective.id);
                        }
                      }}
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
