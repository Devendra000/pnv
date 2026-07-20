'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ListItem {
  id: string;
  name: string;
  address?: string | null;
}

interface DynamicListProps {
  items: ListItem[];
  onAdd: (name: string, address?: string) => void;
  onRemove: (id: string) => void;
  label: string;
  showAddress?: boolean;
  maxItems?: number;
}

export function DynamicList({
  items,
  onAdd,
  onRemove,
  label,
  showAddress = false,
  maxItems,
}: DynamicListProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const isAtLimit = typeof maxItems === 'number' && items.length >= maxItems;

  const handleAdd = () => {
    if (!name.trim() || isAtLimit) {
      return;
    }

    onAdd(name, showAddress ? address : undefined);
    setName('');
    setAddress('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    setName('');
    setAddress('');
    setIsAdding(false);
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
                {showAddress && item.address && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.address}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
        {!isAdding ? (
          <Button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isAtLimit}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {label.replace(/s$/, '')}
          </Button>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                New {label.replace(/s$/, '')}
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-foreground transition-colors"
                aria-label={`Cancel adding ${label.toLowerCase()}`}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
            <Input
              name="name"
              placeholder={`Add ${label.toLowerCase()}`}
              className="bg-white dark:bg-slate-800"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAtLimit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            {showAddress && (
              <Input
                name="address"
                placeholder="Address (optional)"
                className="bg-white dark:bg-slate-800"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isAtLimit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            )}
            <Button
              type="button"
              onClick={handleAdd}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isAtLimit}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {label.replace(/s$/, '')}
            </Button>
          </>
        )}
        {isAtLimit && (
          <p className="text-xs text-slate-500">
            {label} limit reached.
          </p>
        )}
      </div>
    </div>
  );
}
