'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollText, Search, Filter, ChevronDown, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────── */

interface LogEvent {
  event_id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  trace_id?: string;
  span_id?: string;
  metadata?: Record<string, unknown>;
}

/* ── Constants ──────────────────────────────────────── */

const LEVELS = ['all', 'error', 'warning', 'info', 'debug'] as const;
type Level = (typeof LEVELS)[number];

const TIME_RANGES = [
  { label: 'Last 15m', value: '15m' },
  { label: 'Last 1h', value: '1h' },
  { label: 'Last 6h', value: '6h' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
] as const;

const LEVEL_STYLES: Record<string, { badge: string; dot: string }> = {
  error: {
    badge: 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20',
    dot: 'bg-[var(--error)]',
  },
  warning: {
    badge: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20',
    dot: 'bg-[var(--warning)]',
  },
  info: {
    badge: 'bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/20',
    dot: 'bg-[var(--info)]',
  },
  debug: {
    badge: 'bg-muted text-muted-foreground border border-border/50',
    dot: 'bg-muted-foreground',
  },
};

/* ── Helpers ────────────────────────────────────────── */

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return ts;
  }
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/* ── Component ──────────────────────────────────────── */

export default function LogsPage() {
  // Filter state
  const [level, setLevel] = useState<Level>('all');
  const [service, setService] = useState('all');
  const [timeRange, setTimeRange] = useState('1h');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data state
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // UI state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  // Refs
  const timeRangeRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  // Derive unique services from fetched logs
  const services = Array.from(new Set(logs.map((l) => l.service).filter(Boolean))).sort();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (timeRangeRef.current && !timeRangeRef.current.contains(e.target as Node)) {
        setTimeRangeOpen(false);
      }
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (level !== 'all') params.set('level', level);
      if (service !== 'all') params.set('service', service);
      if (timeRange) params.set('timeRange', timeRange);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/explore/logs?${params}`, { credentials: 'include' });
      const data = await res.json();
      setLogs(data.events || []);
    } catch {
      // Network or parse error -- keep existing logs visible
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [level, service, timeRange, debouncedSearch]);

  // Auto-fetch on filter change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Toggle expanded row
  function toggleRow(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id));
  }

  // Active time range label
  const activeTimeLabel = TIME_RANGES.find((t) => t.value === timeRange)?.label ?? timeRange;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search and filter logs across all services
          </p>
        </div>
        {!initialLoad && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {logs.length} result{logs.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-xl bg-[var(--sibyl)]/10 text-[var(--sibyl)] hover:bg-[var(--sibyl)]/20 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* ── Filter Bar ──────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        {/* Top row: search + time range */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 transition-colors focus-within:bg-muted/80 focus-within:ring-2 focus-within:ring-[var(--sibyl)]/20">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search log messages..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono placeholder:font-sans placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground text-xs px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Time range dropdown */}
          <div className="relative" ref={timeRangeRef}>
            <button
              onClick={() => setTimeRangeOpen((o) => !o)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors border',
                timeRangeOpen
                  ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)] border-[var(--sibyl)]/20'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              )}
            >
              <Clock size={13} />
              <span>{activeTimeLabel}</span>
              <ChevronDown
                size={12}
                className={cn('transition-transform', timeRangeOpen && 'rotate-180')}
              />
            </button>
            {timeRangeOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] glass-card rounded-xl p-1.5 shadow-lg animate-scale-in">
                {TIME_RANGES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setTimeRange(t.value);
                      setTimeRangeOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      timeRange === t.value
                        ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)]'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service dropdown */}
          <div className="relative" ref={serviceRef}>
            <button
              onClick={() => setServiceDropdownOpen((o) => !o)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors border',
                serviceDropdownOpen
                  ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)] border-[var(--sibyl)]/20'
                  : service !== 'all'
                    ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)] border-[var(--sibyl)]/20'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              )}
            >
              <Filter size={13} />
              <span className="max-w-[100px] truncate">
                {service === 'all' ? 'All Services' : service}
              </span>
              <ChevronDown
                size={12}
                className={cn('transition-transform', serviceDropdownOpen && 'rotate-180')}
              />
            </button>
            {serviceDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] max-h-[240px] overflow-y-auto glass-card rounded-xl p-1.5 shadow-lg animate-scale-in">
                <button
                  onClick={() => {
                    setService('all');
                    setServiceDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    service === 'all'
                      ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  All Services
                </button>
                {services.length > 0 ? (
                  services.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setService(s);
                        setServiceDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors',
                        service === s
                          ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-[11px] text-muted-foreground">
                    No services found
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: level chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Level</span>
          {LEVELS.map((l) => {
            const isActive = level === l;
            let activeClasses = 'bg-[var(--sibyl)]/10 text-[var(--sibyl)] border-[var(--sibyl)]/20';
            if (l === 'error' && isActive)
              activeClasses = 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20';
            if (l === 'warning' && isActive)
              activeClasses =
                'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20';
            if (l === 'info' && isActive)
              activeClasses = 'bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20';
            if (l === 'debug' && isActive)
              activeClasses = 'bg-muted text-foreground border-border/50';

            return (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-all border',
                  isActive ? activeClasses : 'text-muted-foreground border-transparent hover:bg-muted/80'
                )}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Log List ────────────────────────────────── */}
      {initialLoad && loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <RefreshCw size={24} className="mx-auto text-muted-foreground mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        /* ── Empty State ──────────────────────────── */
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted/80 flex items-center justify-center">
            <ScrollText size={26} className="text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1.5">No logs found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery || level !== 'all' || service !== 'all'
              ? 'Try adjusting your filters or broadening the time range.'
              : 'Logs will appear once your services start sending events through the Sibyl SDK.'}
          </p>
        </div>
      ) : (
        /* ── Scrollable Log Container ─────────────── */
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Column header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-muted/30">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[90px] shrink-0">
              Timestamp
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[62px] shrink-0">
              Level
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[120px] shrink-0">
              Service
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">
              Message
            </span>
          </div>

          {/* Scrollable rows */}
          <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
            {logs.map((log, i) => {
              const rowId = log.event_id || `log-${i}`;
              const isExpanded = expandedRow === rowId;
              const style = LEVEL_STYLES[log.level] ?? LEVEL_STYLES.debug;

              return (
                <div key={rowId}>
                  {/* Log Row */}
                  <button
                    onClick={() => toggleRow(rowId)}
                    className={cn(
                      'w-full text-left flex items-center gap-3 px-4 py-1.5 transition-colors cursor-pointer',
                      i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20',
                      isExpanded
                        ? 'bg-[var(--sibyl)]/[0.04]'
                        : 'hover:bg-muted/40'
                    )}
                  >
                    {/* Timestamp */}
                    <span className="text-[11px] text-muted-foreground font-mono tabular-nums w-[90px] shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>

                    {/* Level badge */}
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full w-[62px] text-center shrink-0',
                        style.badge
                      )}
                    >
                      {log.level}
                    </span>

                    {/* Service */}
                    <span className="text-[11px] text-[var(--sibyl)] font-mono w-[120px] shrink-0 truncate">
                      {log.service}
                    </span>

                    {/* Message */}
                    <span className="text-sm font-mono text-foreground/90 flex-1 truncate">
                      {log.message}
                    </span>

                    {/* Expand indicator */}
                    <ChevronDown
                      size={12}
                      className={cn(
                        'text-muted-foreground shrink-0 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-muted/30 border-y border-border/20 animate-slide-up">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        <DetailField label="Event ID" value={log.event_id} mono />
                        <DetailField
                          label="Full Timestamp"
                          value={
                            formatDate(log.timestamp) + ' ' + formatTimestamp(log.timestamp)
                          }
                          mono
                        />
                        {log.trace_id && (
                          <DetailField label="Trace ID" value={log.trace_id} mono />
                        )}
                        {log.span_id && (
                          <DetailField label="Span ID" value={log.span_id} mono />
                        )}
                      </div>

                      {/* Full message */}
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Full Message
                        </p>
                        <p className="text-sm font-mono text-foreground/90 whitespace-pre-wrap break-all bg-muted/50 rounded-lg p-3">
                          {log.message}
                        </p>
                      </div>

                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Metadata
                          </p>
                          <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-all bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          'text-xs text-foreground/90 truncate',
          mono && 'font-mono'
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
