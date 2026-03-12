'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GitBranch, Search, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TracesPage() {
  const [traces, setTraces] = useState<any[]>([]);
  const [service, setService] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Traces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Distributed traces across your services
        </p>
      </div>

      {traces.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <GitBranch size={32} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No traces found</h3>
          <p className="text-sm text-muted-foreground">
            Traces will appear once your services are instrumented with the Sibyl SDK.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {traces.map((trace: any) => (
            <Link
              key={trace.trace_id}
              href={`/dashboard/traces/${trace.trace_id}`}
              className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-[var(--sibyl)]/20 transition-all group"
            >
              <div className={cn(
                'w-2 h-2 rounded-full',
                trace.status === 'error' ? 'bg-[var(--error)]' : 'bg-[var(--success)]'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {trace.service} / {trace.operation}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {(trace.duration_us / 1000).toFixed(1)}ms
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {trace.span_count} spans
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock size={10} /> {trace.start_time}
                  </span>
                </div>
              </div>
              <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
