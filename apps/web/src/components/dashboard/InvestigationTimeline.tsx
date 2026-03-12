'use client';

import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Investigation {
  id: string;
  query: string;
  status: 'running' | 'completed' | 'failed';
  confidence?: number;
  createdAt: string;
}

interface InvestigationTimelineProps {
  investigations: Investigation[];
  className?: string;
}

export function InvestigationTimeline({
  investigations,
  className,
}: InvestigationTimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {investigations.map((inv, i) => (
        <Link
          key={inv.id}
          href={`/dashboard/investigate/${inv.id}`}
          className="flex gap-3 py-3 group hover:bg-muted/30 rounded-xl px-2 transition-colors"
        >
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                inv.status === 'completed'
                  ? 'bg-[var(--success)]/10'
                  : inv.status === 'failed'
                    ? 'bg-[var(--error)]/10'
                    : 'bg-[var(--sibyl)]/10'
              )}
            >
              {inv.status === 'completed' ? (
                <CheckCircle size={12} className="text-[var(--success)]" />
              ) : inv.status === 'failed' ? (
                <XCircle size={12} className="text-[var(--error)]" />
              ) : (
                <Loader2
                  size={12}
                  className="text-[var(--sibyl)] animate-spin"
                />
              )}
            </div>
            {i < investigations.length - 1 && (
              <div className="w-px flex-1 bg-border/50 mt-1" />
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <p className="text-[13px] font-medium truncate group-hover:text-[var(--sibyl)] transition-colors">
              {inv.query}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-muted-foreground capitalize">
                {inv.status}
              </span>
              {inv.confidence && (
                <span className="text-[10px] font-mono text-[var(--sibyl)]">
                  {inv.confidence}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(inv.createdAt)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
