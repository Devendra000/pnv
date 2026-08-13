'use client';

import { Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left text-sm font-semibold text-foreground"
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {data.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="px-6 py-4 text-sm text-foreground"
                >
                  {col.render
                    ? col.render((row as any)[col.key], row)
                    : String((row as any)[col.key] || '-')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="text-slate-500 hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this? This cannot be undone.')) {
                            onDelete(row.id);
                          }
                        }}
                        className="text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
