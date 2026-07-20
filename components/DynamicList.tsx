'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ListItem {
  id: string;
  name: string;
  role?: string;
}

interface DynamicListProps {
  items: ListItem[];
  onAdd: (name: string, role?: string) => void;
  onRemove: (id: string) => void;
  label: string;
  showRole?: boolean;
}

export function DynamicList({
  items,
  onAdd,
  onRemove,
  label,
  showRole = false,
}: DynamicListProps) {
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;

    if (name.trim()) {
      onAdd(name, showRole ? role : undefined);
      (e.currentTarget as HTMLFormElement).reset();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.name}</p>
                {showRole && item.role && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.role}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="text-slate-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleAdd} className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <Input
          name="name"
          placeholder={`Add ${label.toLowerCase()}`}
          className="bg-white dark:bg-slate-800"
          required
        />
        {showRole && (
          <Input
            name="role"
            placeholder="Role/Title (optional)"
            className="bg-white dark:bg-slate-800"
          />
        )}
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {label.replace(/s$/, '')}
        </Button>
      </form>
    </div>
  );
}
