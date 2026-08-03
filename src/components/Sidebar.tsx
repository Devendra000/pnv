'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Target, Variable, FileText, FileStack, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/objectives', label: 'Objectives', icon: Target },
  { href: '/variables', label: 'Variables', icon: Variable },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/documents', label: 'Documents', icon: FileStack },
];

export function Sidebar() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith('/documents')) {
      try {
        sessionStorage.removeItem('docgen_active_folder_id');
      } catch (e) {
        console.error('Error clearing sessionStorage:', e);
      }
    }
  }, [pathname]);

  return (
    <aside className="w-64 bg-card border-r border-border sticky top-16 h-[calc(100vh-64px)] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configuration</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <p>DocGen v1.0.0</p>
      </div>
    </aside>
  );
}
