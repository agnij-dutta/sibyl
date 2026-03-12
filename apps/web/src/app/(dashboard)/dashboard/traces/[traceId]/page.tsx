'use client';

import { useState, useEffect, use } from 'react';
import { GitBranch, ArrowLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { TraceWaterfall, type Span } from '@/components/traces/TraceWaterfall';

interface TraceDetailPageProps {
  params: Promise<{ traceId: string }>;
}

export default function TraceDetailPage({ params }: TraceDetailPageProps) {
  const { traceId } = use(params);
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchSpans() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/explore/traces/${encodeURIComponent(traceId)}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch trace: ${res.status}`);
      }
      const data = await res.json();
      setSpans(data.spans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trace data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSpans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceId]);

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/traces"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to traces
        </Link>

        {!loading && (
          <button
            onClick={fetchSpans}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        )}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--sibyl)]/10">
            <GitBranch size={18} className="text-[var(--sibyl)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Trace Waterfall</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {traceId}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2 size={24} className="mx-auto text-[var(--sibyl)] mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading trace spans...</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <AlertTriangle size={24} className="mx-auto text-[var(--warning)] mb-3" />
          <h3 className="font-semibold mb-1 text-sm">Failed to Load Trace</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchSpans}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm"
          >
            <RefreshCw size={14} className="relative z-10" />
            <span className="relative z-10">Retry</span>
          </button>
        </div>
      ) : spans.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <GitBranch size={32} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No Spans Found</h3>
          <p className="text-sm text-muted-foreground">
            No spans were found for trace <span className="font-mono">{traceId}</span>.
            The trace may not have been ingested yet or may have expired.
          </p>
        </div>
      ) : (
        <TraceWaterfall spans={spans} traceId={traceId} />
      )}
    </div>
  );
}
