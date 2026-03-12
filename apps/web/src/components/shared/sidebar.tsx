'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  AlertTriangle,
  ScrollText,
  GitBranch,
  Network,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Investigate', href: '/dashboard/investigate', icon: Search },
  { label: 'Incidents', href: '/dashboard/incidents', icon: AlertTriangle },
  { label: 'Logs', href: '/dashboard/logs', icon: ScrollText },
  { label: 'Traces', href: '/dashboard/traces', icon: GitBranch },
  { label: 'Services', href: '/dashboard/services', icon: Network },
  { label: 'Alerts', href: '/dashboard/alerts', icon: Bell },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  user?: { name: string; email: string } | null;
  org?: { name: string; plan: string } | null;
  onLogout?: () => void;
}

export function Sidebar({ user, org, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 bottom-0 z-40 flex flex-col border-r transition-all duration-300',
        'border-border/50 bg-background/80 backdrop-blur-xl',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-[var(--sibyl)]/20 blur-md" />
            <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-[var(--sibyl)] to-[var(--sibyl-dark)] flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold tracking-[-0.02em]">
              Sibyl
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'text-foreground bg-[var(--sibyl)]/[0.08]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--sibyl)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon
                size={16}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive
                    ? 'text-[var(--sibyl)]'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="px-2 py-3 border-t border-border/50">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--sibyl)]/10 flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-[var(--sibyl)]">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">
                {user.email}
              </p>
            </div>
            {org && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--sibyl)]/[0.08] text-[10px] font-semibold text-[var(--sibyl)] uppercase tracking-wider">
                {org.plan}
              </span>
            )}
          </div>
        )}
        <button
          onClick={onLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium',
            'text-muted-foreground hover:text-destructive hover:bg-destructive/[0.06] transition-all duration-200',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
