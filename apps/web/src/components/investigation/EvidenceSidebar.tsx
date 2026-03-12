'use client';

import { useState } from 'react';
import { Layers, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EvidenceCard, type Evidence } from './EvidenceCard';

interface EvidenceSidebarProps {
  evidence: Evidence[];
  correlations?: string[];
  onEvidenceClick?: (evidence: Evidence) => void;
}

const typeFilters = ['all', 'log', 'trace', 'deploy', 'incident'] as const;

export function EvidenceSidebar({ evidence, correlations, onEvidenceClick }: EvidenceSidebarProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all'
    ? evidence
    : evidence.filter(e => e.type === filter);

  const typeCounts = evidence.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-80 shrink-0 space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={14} className="text-[var(--sibyl)]" />
          <h3 className="text-sm font-semibold">Evidence</h3>
          <span className="ml-auto text-[11px] text-muted-foreground">{evidence.length} items</span>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-1.5">
          {typeFilters.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                'px-2 py-1 rounded-lg text-[10px] font-medium transition-colors capitalize',
                filter === t
                  ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)]'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {t} {t !== 'all' && typeCounts[t] ? `(${typeCounts[t]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Correlations */}
      {correlations && correlations.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Auto-Correlations
          </h4>
          <div className="space-y-2">
            {correlations.map((c, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[var(--sibyl)]/[0.04] border border-[var(--sibyl)]/10">
                <p className="text-[12px] leading-relaxed">{c}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-4">
            No evidence found
          </p>
        ) : (
          filtered.map((e) => (
            <EvidenceCard
              key={`${e.type}-${e.id}`}
              evidence={e}
              onClick={() => onEvidenceClick?.(e)}
            />
          ))
        )}
      </div>
    </div>
  );
}
