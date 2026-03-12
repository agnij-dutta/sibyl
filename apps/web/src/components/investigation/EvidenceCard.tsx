'use client';

import Link from 'next/link';
import {
  ScrollText,
  GitBranch,
  Rocket,
  BarChart3,
  AlertTriangle,
  Link2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Evidence {
  type: 'log' | 'trace' | 'deploy' | 'metric' | 'incident' | 'correlation';
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  severity?: 'error' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
}

const typeConfig = {
  log: { icon: ScrollText, color: 'var(--sibyl)', label: 'Log', href: '/dashboard/logs' },
  trace: { icon: GitBranch, color: 'var(--info)', label: 'Trace', href: '/dashboard/traces' },
  deploy: { icon: Rocket, color: 'var(--success)', label: 'Deploy', href: '/dashboard/settings' },
  metric: { icon: BarChart3, color: 'var(--warning)', label: 'Metric', href: '/dashboard' },
  incident: { icon: AlertTriangle, color: 'var(--error)', label: 'Incident', href: '/dashboard/incidents' },
  correlation: { icon: Link2, color: 'var(--sibyl-light)', label: 'Correlation', href: '#' },
};

interface EvidenceCardProps {
  evidence: Evidence;
  compact?: boolean;
  onClick?: () => void;
}

export function EvidenceCard({ evidence, compact = false, onClick }: EvidenceCardProps) {
  const config = typeConfig[evidence.type] || typeConfig.log;
  const Icon = config.icon;

  const severityColors = {
    error: 'border-[var(--error)]/20 bg-[var(--error)]/[0.03]',
    warning: 'border-[var(--warning)]/20 bg-[var(--warning)]/[0.03]',
    info: 'border-border/50',
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full',
          'border transition-all hover:border-[var(--sibyl)]/30 hover:bg-[var(--sibyl)]/[0.03]',
          evidence.severity ? severityColors[evidence.severity] : 'border-border/30'
        )}
      >
        <Icon size={12} style={{ color: config.color }} className="shrink-0" />
        <span className="text-[11px] font-medium truncate flex-1">{evidence.title}</span>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          {config.label}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl p-4 text-left w-full border transition-all group',
        'hover:border-[var(--sibyl)]/30 hover:shadow-sm',
        evidence.severity ? severityColors[evidence.severity] : 'border-border/30 bg-background/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="p-1.5 rounded-lg shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)` }}
        >
          <Icon size={14} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock size={8} />
              {formatTime(evidence.timestamp)}
            </span>
          </div>
          <p className="text-[13px] font-medium truncate group-hover:text-[var(--sibyl)] transition-colors">
            {evidence.title}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {evidence.preview}
          </p>
        </div>
      </div>
    </button>
  );
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}
