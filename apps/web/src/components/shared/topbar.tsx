'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Moon, Sun, Command } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/investigate': 'Investigate',
  '/dashboard/incidents': 'Incidents',
  '/dashboard/logs': 'Log Explorer',
  '/dashboard/traces': 'Traces',
  '/dashboard/services': 'Services',
  '/dashboard/alerts': 'Alerts',
  '/dashboard/settings': 'Settings',
};

export function Topbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Build breadcrumbs
  const segments = pathname.split('/').filter(Boolean);
  const currentLabel = routeLabels[pathname] || segments[segments.length - 1] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 h-[60px] flex items-center justify-between px-8 border-b border-border/50 bg-background/60 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-muted-foreground">Dashboard</span>
        {currentLabel !== 'Overview' && (
          <>
            <ChevronRight size={12} className="text-muted-foreground" />
            <span className="font-medium">{currentLabel}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Quick search hint */}
        <button
          className={cn(
            'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl',
            'text-[12px] text-muted-foreground',
            'bg-muted/50 border border-border/50',
            'hover:bg-muted transition-colors'
          )}
        >
          <Command size={12} />
          <span>Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-background text-[10px] font-mono border border-border/50">
            /
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Sun size={16} className="hidden dark:block" />
          <Moon size={16} className="block dark:hidden" />
        </button>
      </div>
    </header>
  );
}
