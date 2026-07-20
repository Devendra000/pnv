'use client';

import { useState, useMemo } from 'react';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } =
    useAppDataContext();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    content: '',
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const handleAdd = () => {
    if (newTemplate.name.trim() && newTemplate.content.trim()) {
      addTemplate({
        id: `tmpl-${Date.now()}`,
        ...newTemplate,
        createdDate: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0],
      });
      setNewTemplate({
        name: '',
        description: '',
        content: '',
      });
      setIsAdding(false);
    }
  };

  const handleUpdate = (id: string) => {
    updateTemplate(id, {
      ...newTemplate,
      lastModified: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setNewTemplate({
      name: '',
      description: '',
      content: '',
    });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Document Templates"
        description="Manage templates for document generation"
        actions={
          !isAdding && !editingId && (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          )
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="mb-6 bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Template' : 'New Template'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Template Name <span className="text-primary">*</span>
                </label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="e.g., Corporate Charter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of the template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Template Content <span className="text-primary">*</span>
                </label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, content: e.target.value })
                  }
                  placeholder="Use {{CompanyName}}, {{OwnerNames}}, etc. as variables"
                  className="w-full h-40 px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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
                  {editingId ? 'Update' : 'Create'} Template
                </Button>
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewTemplate({
                      name: '',
                      description: '',
                      content: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No templates found matching your search' : 'No templates yet. Create one to get started!'}
              </p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(
                      expandedId === template.id ? null : template.id
                    )
                  }
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {expandedId === template.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedId === template.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Content Preview:
                      </p>
                      <pre className="bg-input/50 p-3 rounded text-sm text-foreground whitespace-pre-wrap break-words font-mono max-h-40 overflow-y-auto">
                        {template.content}
                      </pre>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => {
                          setEditingId(template.id);
                          setNewTemplate({
                            name: template.name,
                            description: template.description,
                            content: template.content,
                          });
                          setExpandedId(null);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
