'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SpanDetail } from './SpanDetail';

/* ── Types ─────────────────────────────────────────────── */

interface SpanEvent {
  name: string;
  timestamp: string;
}

export interface Span {
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
}

interface SpanNode {
  span: Span;
  children: SpanNode[];
}

interface FlatSpan {
  span: Span;
  depth: number;
}

interface TraceWaterfallProps {
  spans: Span[];
  traceId: string;
}

/* ── Service color palette ─────────────────────────────── */

const SERVICE_COLORS = [
  { bar: 'bg-[var(--sibyl)]/70', dot: 'bg-[var(--sibyl)]' },
  { bar: 'bg-emerald-500/60', dot: 'bg-emerald-500' },
  { bar: 'bg-amber-500/60', dot: 'bg-amber-500' },
  { bar: 'bg-cyan-500/60', dot: 'bg-cyan-500' },
  { bar: 'bg-pink-500/60', dot: 'bg-pink-500' },
  { bar: 'bg-violet-500/60', dot: 'bg-violet-500' },
  { bar: 'bg-orange-500/60', dot: 'bg-orange-500' },
  { bar: 'bg-teal-500/60', dot: 'bg-teal-500' },
];

function getServiceColor(service: string, serviceMap: Map<string, number>) {
  if (!serviceMap.has(service)) {
    serviceMap.set(service, serviceMap.size);
  }
  const idx = serviceMap.get(service)!;
  return SERVICE_COLORS[idx % SERVICE_COLORS.length];
}

/* ── Tree building ─────────────────────────────────────── */

function buildSpanTree(spans: Span[]): SpanNode[] {
  const spanMap = new Map<string, SpanNode>();
  const roots: SpanNode[] = [];

  // Create nodes
  for (const span of spans) {
    spanMap.set(span.span_id, { span, children: [] });
  }

  // Build parent-child relationships
  for (const span of spans) {
    const node = spanMap.get(span.span_id)!;
    if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
      spanMap.get(span.parent_span_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by start_time at each level
  function sortChildren(nodes: SpanNode[]) {
    nodes.sort(
      (a, b) =>
        new Date(a.span.start_time).getTime() -
        new Date(b.span.start_time).getTime()
    );
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }

  sortChildren(roots);
  return roots;
}

/* ── Flatten tree ──────────────────────────────────────── */

function flattenTree(nodes: SpanNode[], depth: number = 0): FlatSpan[] {
  const result: FlatSpan[] = [];
  for (const node of nodes) {
    result.push({ span: node.span, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

/* ── Duration formatting ───────────────────────────────── */

function formatDuration(us: number): string {
  if (us < 1000) return `${us}us`;
  if (us < 1_000_000) return `${(us / 1000).toFixed(2)}ms`;
  return `${(us / 1_000_000).toFixed(3)}s`;
}

function formatTimeMarker(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/* ── Component ─────────────────────────────────────────── */

export function TraceWaterfall({ spans, traceId }: TraceWaterfallProps) {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  // Memoize all derived computations
  const { flattenedSpans, traceStart, traceDuration, serviceColorMap } =
    useMemo(() => {
      if (spans.length === 0) {
        return {
          flattenedSpans: [] as FlatSpan[],
          traceStart: 0,
          traceDuration: 1,
          serviceColorMap: new Map<string, number>(),
        };
      }

      const start = Math.min(
        ...spans.map((s) => new Date(s.start_time).getTime())
      );
      const end = Math.max(
        ...spans.map(
          (s) => new Date(s.start_time).getTime() + s.duration_us / 1000
        )
      );
      const duration = Math.max(end - start, 1); // Prevent division by zero

      const tree = buildSpanTree(spans);
      const flattened = flattenTree(tree);

      // Build service color map in tree order so colors are stable
      const colorMap = new Map<string, number>();
      for (const { span } of flattened) {
        if (!colorMap.has(span.service)) {
          colorMap.set(span.service, colorMap.size);
        }
      }

      return {
        flattenedSpans: flattened,
        traceStart: start,
        traceDuration: duration,
        serviceColorMap: colorMap,
      };
    }, [spans]);

  const handleSelectSpan = useCallback((span: Span) => {
    setSelectedSpan((prev) => (prev?.span_id === span.span_id ? null : span));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSpan(null);
  }, []);

  // Time markers at 0%, 25%, 50%, 75%, 100%
  const timeMarkers = [0, 0.25, 0.5, 0.75, 1];

  if (spans.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No spans found for this trace.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Waterfall */}
      <div className="flex-1 min-w-0 glass-card rounded-2xl p-4 overflow-x-auto">
        {/* Trace summary header */}
        <div className="flex items-center gap-4 mb-4 pb-3 border-b border-border/30">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Trace ID
            </p>
            <p className="text-xs font-mono text-foreground/80 mt-0.5">
              {traceId}
            </p>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Duration
            </p>
            <p className="text-xs font-mono text-foreground/80 mt-0.5">
              {formatTimeMarker(traceDuration)}
            </p>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Spans
            </p>
            <p className="text-xs font-mono text-foreground/80 mt-0.5">
              {spans.length}
            </p>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Services
            </p>
            <p className="text-xs font-mono text-foreground/80 mt-0.5">
              {serviceColorMap.size}
            </p>
          </div>
        </div>

        {/* Timeline header */}
        <div className="flex items-center h-8 text-[10px] text-muted-foreground font-mono border-b border-border/30 mb-1">
          <div className="w-56 shrink-0 px-3 text-[10px] uppercase tracking-wider font-semibold font-sans">
            Service / Operation
          </div>
          <div className="flex-1 relative h-full">
            {timeMarkers.map((pct) => (
              <span
                key={pct}
                className="absolute bottom-1 -translate-x-1/2"
                style={{ left: `${pct * 100}%` }}
              >
                {formatTimeMarker(traceDuration * pct)}
              </span>
            ))}
            {/* Vertical grid lines */}
            {timeMarkers.map((pct) => (
              <div
                key={`line-${pct}`}
                className="absolute top-0 bottom-0 w-px bg-border/20"
                style={{ left: `${pct * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Span rows */}
        <div className="space-y-0">
          {flattenedSpans.map(({ span, depth }, idx) => {
            const spanStartMs =
              new Date(span.start_time).getTime() - traceStart;
            const spanWidthMs = span.duration_us / 1000;
            const leftPct = (spanStartMs / traceDuration) * 100;
            const widthPct = Math.max(
              (spanWidthMs / traceDuration) * 100,
              0.4
            );

            const isError =
              span.status === 'error' || span.status === 'ERROR';
            const isSelected = selectedSpan?.span_id === span.span_id;

            const serviceColor = getServiceColor(span.service, serviceColorMap);

            return (
              <button
                key={span.span_id}
                onClick={() => handleSelectSpan(span)}
                className={cn(
                  'flex items-center h-9 w-full text-left transition-colors rounded-lg',
                  'hover:bg-muted/40',
                  isSelected && 'bg-[var(--sibyl)]/[0.06] hover:bg-[var(--sibyl)]/[0.08]'
                )}
                style={{
                  animationDelay: `${idx * 20}ms`,
                }}
              >
                {/* Service / Operation label */}
                <div
                  className="w-56 shrink-0 flex items-center gap-1.5 truncate"
                  style={{ paddingLeft: `${12 + depth * 16}px` }}
                >
                  {/* Tree connector lines */}
                  {depth > 0 && (
                    <span className="text-border/60 text-[10px] mr-0.5 select-none">
                      {'|_'}
                    </span>
                  )}
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      isError ? 'bg-[var(--error)]' : serviceColor.dot
                    )}
                  />
                  <span className="text-[11px] text-[var(--sibyl)] font-medium truncate">
                    {span.service}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate font-mono">
                    {span.operation}
                  </span>
                </div>

                {/* Waterfall bar */}
                <div className="flex-1 relative h-full flex items-center min-w-0">
                  {/* Vertical grid lines behind bars */}
                  {timeMarkers.map((pct) => (
                    <div
                      key={`row-line-${pct}`}
                      className="absolute top-0 bottom-0 w-px bg-border/10"
                      style={{ left: `${pct * 100}%` }}
                    />
                  ))}

                  {/* The span bar */}
                  <div
                    className={cn(
                      'h-[22px] rounded-md relative group cursor-pointer transition-all',
                      isError
                        ? 'bg-[var(--error)]/70 hover:bg-[var(--error)]/90'
                        : serviceColor.bar,
                      !isError && 'hover:opacity-90',
                      isSelected &&
                        'ring-2 ring-[var(--sibyl)]/40 ring-offset-1 ring-offset-background'
                    )}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '3px',
                    }}
                  >
                    {/* Duration label inside bar if wide enough */}
                    {widthPct > 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/90 font-medium pointer-events-none">
                        {formatDuration(span.duration_us)}
                      </span>
                    )}

                    {/* Tooltip on hover */}
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center
                        bg-foreground text-background text-[10px] px-2.5 py-1 rounded-lg font-mono whitespace-nowrap z-20
                        shadow-lg pointer-events-none gap-1.5"
                    >
                      <span className="font-semibold">
                        {formatDuration(span.duration_us)}
                      </span>
                      <span className="opacity-60">|</span>
                      <span className="opacity-80">{span.service}</span>
                      <span className="opacity-60">{span.operation}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Service legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 flex-wrap">
          {Array.from(serviceColorMap.entries()).map(([service, idx]) => {
            const color = SERVICE_COLORS[idx % SERVICE_COLORS.length];
            return (
              <div key={service} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', color.dot)} />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {service}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Span detail panel */}
      {selectedSpan && (
        <SpanDetail span={selectedSpan} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
