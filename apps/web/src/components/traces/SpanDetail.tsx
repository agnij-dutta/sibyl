'use client';

import { X, Clock, Server, Activity, AlertCircle, Tag, Layers, Hash, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpanEvent {
  name: string;
  timestamp: string;
}

interface SpanDetailProps {
  span: {
    trace_id: string;
    span_id: string;
    parent_span_id: string;
    service: string;
    operation: string;
    kind: string;
    status: string;
    start_time: string;
    duration_us: number;
    attributes?: Record<string, unknown>;
    events?: SpanEvent[];
  };
  onClose: () => void;
}

interface DetailFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}

function DetailField({ icon, label, value, mono = false }: DetailFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p
          className={cn(
            'text-[12px] mt-0.5 break-all leading-relaxed',
            mono && 'font-mono'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    });
  } catch {
    return ts;
  }
}

function formatDuration(us: number): string {
  if (us < 1000) return `${us}us`;
  if (us < 1_000_000) return `${(us / 1000).toFixed(2)}ms`;
  return `${(us / 1_000_000).toFixed(3)}s`;
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    SPAN_KIND_SERVER: 'Server',
    SPAN_KIND_CLIENT: 'Client',
    SPAN_KIND_PRODUCER: 'Producer',
    SPAN_KIND_CONSUMER: 'Consumer',
    SPAN_KIND_INTERNAL: 'Internal',
    server: 'Server',
    client: 'Client',
    producer: 'Producer',
    consumer: 'Consumer',
    internal: 'Internal',
  };
  return map[kind] || kind;
}

export function SpanDetail({ span, onClose }: SpanDetailProps) {
  const isError = span.status === 'error' || span.status === 'ERROR';
  const statusText = span.status?.toUpperCase() || 'UNSET';

  return (
    <div className="w-80 shrink-0 glass-card rounded-2xl p-5 space-y-5 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Span Detail</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close span detail"
        >
          <X size={14} />
        </button>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold',
          isError
            ? 'bg-[var(--error)]/10 text-[var(--error)]'
            : 'bg-[var(--success)]/10 text-[var(--success)]'
        )}
      >
        {isError ? <AlertCircle size={10} /> : <Activity size={10} />}
        {statusText}
      </div>

      {/* Key-value fields */}
      <div className="space-y-3.5">
        <DetailField
          icon={<Server size={12} />}
          label="Service"
          value={span.service}
        />
        <DetailField
          icon={<Zap size={12} />}
          label="Operation"
          value={span.operation}
          mono
        />
        <DetailField
          icon={<Layers size={12} />}
          label="Kind"
          value={kindLabel(span.kind)}
        />
        <DetailField
          icon={<Clock size={12} />}
          label="Duration"
          value={formatDuration(span.duration_us)}
          mono
        />
        <DetailField
          icon={<Clock size={12} />}
          label="Start Time"
          value={formatTimestamp(span.start_time)}
          mono
        />
        <DetailField
          icon={<Hash size={12} />}
          label="Trace ID"
          value={span.trace_id}
          mono
        />
        <DetailField
          icon={<Hash size={12} />}
          label="Span ID"
          value={span.span_id}
          mono
        />
        {span.parent_span_id && (
          <DetailField
            icon={<Hash size={12} />}
            label="Parent Span ID"
            value={span.parent_span_id}
            mono
          />
        )}
      </div>

      {/* Attributes section */}
      {span.attributes && Object.keys(span.attributes).length > 0 && (
        <div>
          <div className="h-px bg-border/50 mb-4" />
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Attributes
          </h4>
          <div className="space-y-2">
            {Object.entries(span.attributes).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 group">
                <Tag
                  size={10}
                  className="text-muted-foreground mt-0.5 shrink-0 group-hover:text-[var(--sibyl)] transition-colors"
                />
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {key}:
                </span>
                <span className="text-[11px] font-mono break-all text-foreground/80">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events timeline */}
      {span.events && span.events.length > 0 && (
        <div>
          <div className="h-px bg-border/50 mb-4" />
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Events ({span.events.length})
          </h4>
          <div className="space-y-0">
            {span.events.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 relative">
                {/* Timeline connector */}
                {idx < span.events!.length - 1 && (
                  <div className="absolute left-[5px] top-3 w-px h-full bg-border/50" />
                )}
                {/* Dot */}
                <div className="w-[11px] h-[11px] rounded-full border-2 border-[var(--sibyl)] bg-background shrink-0 mt-0.5 relative z-10" />
                <div className="pb-3 min-w-0">
                  <p className="text-[11px] font-medium leading-tight">{event.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
