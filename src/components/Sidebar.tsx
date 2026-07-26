'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Target, Variable, FileText, FileStack, BarChart3, MessageSquare, LogOut, Shield } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/objectives', label: 'Objectives', icon: Target },
  { href: '/variables', label: 'Variables', icon: Variable },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/documents', label: 'Documents', icon: FileStack },
  { href: '/chat', label: 'Team Chat', icon: MessageSquare },
];

interface SidebarProps {
  session?: any;
}

export function Sidebar({ session: initialSession }: SidebarProps) {
  const pathname = usePathname();
  const { data: clientSession } = useSession();
  const session = initialSession || clientSession;

  const user = session?.user;
  const username = user?.username || user?.name || 'User';
  const role = user?.role || 'USER';
  const initial = username[0]?.toUpperCase() || 'U';

  useEffect(() => {
    if (!pathname.startsWith('/documents')) {
      try {
        sessionStorage.removeItem('docgen_active_folder_id');
      } catch (e) {
        console.error('Error clearing sessionStorage:', e);
      }
    }
  }, [pathname]);

  return (
    <aside className="w-64 bg-card border-r border-border sticky top-16 h-[calc(100vh-64px)] flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Navigation</h2>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer - User Profile & Logout */}
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name || username}</p>
              <div className="flex items-center gap-1">
                {role === 'ADMIN' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded-md">
                    <Shield className="w-2.5 h-2.5" /> ADMIN
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground truncate">@{username}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
