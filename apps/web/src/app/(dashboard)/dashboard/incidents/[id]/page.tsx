'use client';

import { use, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Users,
  Hash,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  ChevronDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ───────────────────────────────────────── */

interface Incident {
  id: string;
  projectId: string;
  fingerprint: string;
  title: string;
  level: 'error' | 'warning' | 'info';
  status: 'open' | 'resolved' | 'ignored';
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  affectedUsers: number;
  metadata?: Record<string, unknown>;
}

interface LogEvent {
  event_id: string;
  timestamp: string;
  level: string;
  service: string;
  environment?: string;
  message: string;
  fingerprint?: string;
  trace_id?: string;
  span_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

/* ── Colour maps ─────────────────────────────────── */

const levelColors: Record<string, { bg: string; text: string; dot: string; icon: string }> = {
  error:   { bg: 'bg-[var(--error)]/10',   text: 'text-[var(--error)]',   dot: 'bg-[var(--error)]',   icon: 'text-[var(--error)]' },
  warning: { bg: 'bg-[var(--warning)]/10', text: 'text-[var(--warning)]', dot: 'bg-[var(--warning)]', icon: 'text-[var(--warning)]' },
  info:    { bg: 'bg-[var(--info)]/10',    text: 'text-[var(--info)]',    dot: 'bg-[var(--info)]',    icon: 'text-[var(--info)]' },
};

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  open:     { label: 'Open',     bg: 'bg-[var(--error)]/10',   text: 'text-[var(--error)]',   icon: AlertTriangle },
  resolved: { label: 'Resolved', bg: 'bg-[var(--success)]/10', text: 'text-[var(--success)]', icon: CheckCircle },
  ignored:  { label: 'Ignored',  bg: 'bg-muted',               text: 'text-muted-foreground', icon: XCircle },
};

/* ── Helpers ─────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/* ── Page component ──────────────────────────────── */

interface IncidentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const { id } = use(params);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── Fetch incident ────────────────────────────── */
  const fetchIncident = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Incident not found' : `Failed to load incident (${res.status})`);
      }
      const data = await res.json();
      setIncident(data.incident);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incident');
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* ── Fetch related events ──────────────────────── */
  const fetchEvents = useCallback(async (inc: Incident) => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({
        q: inc.title,
        limit: '50',
      });
      if (inc.projectId) {
        params.set('projectId', inc.projectId);
      }
      const res = await fetch(`/api/explore/logs?${params}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // Events are non-critical; silently degrade
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  useEffect(() => {
    if (incident) {
      fetchEvents(incident);
    }
  }, [incident, fetchEvents]);

  /* ── Close dropdown on outside click ───────────── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── Update status ─────────────────────────────── */
  async function updateStatus(newStatus: 'open' | 'resolved' | 'ignored') {
    if (!incident || incident.status === newStatus) {
      setStatusDropdownOpen(false);
      return;
    }
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
      }
    } catch {
      // Silently handle
    } finally {
      setUpdatingStatus(false);
      setStatusDropdownOpen(false);
    }
  }

  /* ── Loading state ─────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to incidents
        </Link>
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2 size={24} className="mx-auto text-[var(--sibyl)] mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading incident...</p>
        </div>
      </div>
    );
  }

  /* ── Error state ───────────────────────────────── */
  if (error || !incident) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to incidents
        </Link>
        <div className="glass-card rounded-2xl p-12 text-center">
          <AlertTriangle size={24} className="mx-auto text-[var(--warning)] mb-3" />
          <h3 className="font-semibold mb-1 text-sm">Failed to Load Incident</h3>
          <p className="text-sm text-muted-foreground mb-4">{error || 'Incident not found'}</p>
          <button
            onClick={fetchIncident}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm"
          >
            <RefreshCw size={14} className="relative z-10" />
            <span className="relative z-10">Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const colors = levelColors[incident.level] || levelColors.info;
  const status = statusConfig[incident.status] || statusConfig.open;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* ── Back link ──────────────────────────────── */}
      <Link
        href="/dashboard/incidents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to incidents
      </Link>

      {/* ── Header ─────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn('p-2.5 rounded-xl shrink-0', colors.bg)}>
              <AlertTriangle size={20} className={colors.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight break-words">
                {incident.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Level badge */}
                <span className={cn(
                  'text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md',
                  colors.bg, colors.text
                )}>
                  {incident.level}
                </span>

                {/* Fingerprint */}
                <span className="text-[11px] text-muted-foreground font-mono">
                  {incident.fingerprint.slice(0, 12)}...
                </span>
              </div>
            </div>
          </div>

          {/* Status dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setStatusDropdownOpen(prev => !prev)}
              disabled={updatingStatus}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                status.bg, status.text,
                'hover:opacity-80',
                updatingStatus && 'opacity-50 cursor-not-allowed'
              )}
            >
              {updatingStatus ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <StatusIcon size={12} />
              )}
              {status.label}
              <ChevronDown size={12} className={cn(
                'transition-transform',
                statusDropdownOpen && 'rotate-180'
              )} />
            </button>

            {statusDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 glass-card rounded-xl p-1 min-w-[140px] shadow-lg">
                {(['open', 'resolved', 'ignored'] as const).map((s) => {
                  const cfg = statusConfig[s];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                        incident.status === s
                          ? cn(cfg.bg, cfg.text)
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Icon size={12} />
                      {cfg.label}
                      {incident.status === s && (
                        <CheckCircle size={10} className="ml-auto opacity-60" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Hash size={16} className="text-[var(--sibyl)]" />}
          label="Events"
          value={incident.eventCount.toLocaleString()}
        />
        <StatCard
          icon={<Users size={16} className="text-[var(--info)]" />}
          label="Affected Users"
          value={incident.affectedUsers.toLocaleString()}
        />
        <StatCard
          icon={<Clock size={16} className="text-[var(--warning)]" />}
          label="First Seen"
          value={timeAgo(incident.firstSeen)}
          title={formatTimestamp(incident.firstSeen)}
        />
        <StatCard
          icon={<Activity size={16} className="text-[var(--error)]" />}
          label="Last Seen"
          value={timeAgo(incident.lastSeen)}
          title={formatTimestamp(incident.lastSeen)}
        />
      </div>

      {/* ── Main content: timeline + actions ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Event timeline */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Activity size={14} className="text-[var(--sibyl)]" />
              Event Timeline
            </h2>
            {eventsLoading && (
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            )}
          </div>

          {eventsLoading && events.length === 0 ? (
            <div className="py-12 text-center">
              <Loader2 size={20} className="mx-auto text-[var(--sibyl)] mb-2 animate-spin" />
              <p className="text-xs text-muted-foreground">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center">
              <Activity size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                No events found. Events will appear here once telemetry is ingested.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-0.5">
                {events.map((event, idx) => {
                  const evtColors = levelColors[event.level] || levelColors.info;
                  return (
                    <div key={event.event_id || idx} className="relative pl-7 py-3 group">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-0 top-[18px] w-[15px] h-[15px] rounded-full border-2 border-background z-10',
                        evtColors.dot
                      )} />

                      <div className="rounded-xl border border-transparent group-hover:border-border/50 group-hover:bg-muted/30 transition-all px-3 py-2 -mx-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
                            evtColors.bg, evtColors.text
                          )}>
                            {event.level}
                          </span>
                          {event.service && (
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              {event.service}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                            <Clock size={9} />
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm mt-1.5 break-words leading-relaxed">
                          {event.message}
                        </p>
                        {event.trace_id && (
                          <Link
                            href={`/dashboard/traces/${event.trace_id}`}
                            className="inline-flex items-center gap-1 text-[10px] text-[var(--sibyl)] hover:underline mt-1.5"
                          >
                            <ExternalLink size={9} />
                            Trace {event.trace_id.slice(0, 8)}...
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-3">
          {/* Investigate */}
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Investigate
            </h3>
            <Link
              href={`/dashboard/investigate?q=${encodeURIComponent(incident.title)}&project=${encodeURIComponent(incident.projectId)}`}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm"
            >
              <Search size={14} className="relative z-10" />
              <span className="relative z-10">AI Investigate</span>
            </Link>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Ask Sibyl to analyze root cause
            </p>
          </div>

          {/* Quick actions */}
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => updateStatus('resolved')}
                disabled={updatingStatus || incident.status === 'resolved'}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  incident.status === 'resolved'
                    ? 'bg-[var(--success)]/10 text-[var(--success)] cursor-default'
                    : 'border border-border hover:border-[var(--success)]/30 hover:bg-[var(--success)]/5 text-foreground',
                  updatingStatus && 'opacity-50 cursor-not-allowed'
                )}
              >
                {updatingStatus ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} className={incident.status === 'resolved' ? 'text-[var(--success)]' : ''} />
                )}
                {incident.status === 'resolved' ? 'Resolved' : 'Resolve'}
              </button>

              <button
                onClick={() => updateStatus('ignored')}
                disabled={updatingStatus || incident.status === 'ignored'}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  incident.status === 'ignored'
                    ? 'bg-muted text-muted-foreground cursor-default'
                    : 'border border-border hover:border-muted-foreground/30 hover:bg-muted/50 text-foreground',
                  updatingStatus && 'opacity-50 cursor-not-allowed'
                )}
              >
                {updatingStatus ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} className={incident.status === 'ignored' ? 'text-muted-foreground' : ''} />
                )}
                {incident.status === 'ignored' ? 'Ignored' : 'Ignore'}
              </button>

              {incident.status !== 'open' && (
                <button
                  onClick={() => updateStatus('open')}
                  disabled={updatingStatus}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    'border border-border hover:border-[var(--warning)]/30 hover:bg-[var(--warning)]/5 text-foreground',
                    updatingStatus && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {updatingStatus ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Incident info */}
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Details
            </h3>
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-[11px] truncate max-w-[140px]" title={incident.id}>
                  {incident.id}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fingerprint</dt>
                <dd className="font-mono text-[11px] truncate max-w-[140px]" title={incident.fingerprint}>
                  {incident.fingerprint}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Project</dt>
                <dd className="font-mono text-[11px] truncate max-w-[140px]" title={incident.projectId}>
                  {incident.projectId}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">First seen</dt>
                <dd>{formatTimestamp(incident.firstSeen)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last seen</dt>
                <dd>{formatTimestamp(incident.lastSeen)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stat card sub-component ─────────────────────── */

function StatCard({
  icon,
  label,
  value,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4" title={title}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}
