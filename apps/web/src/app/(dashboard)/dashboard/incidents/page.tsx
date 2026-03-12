'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, Users, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const levelColors = {
  error: { bg: 'bg-[var(--error)]/10', text: 'text-[var(--error)]', dot: 'bg-[var(--error)]' },
  warning: { bg: 'bg-[var(--warning)]/10', text: 'text-[var(--warning)]', dot: 'bg-[var(--warning)]' },
  info: { bg: 'bg-[var(--info)]/10', text: 'text-[var(--info)]', dot: 'bg-[var(--info)]' },
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/incidents?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setIncidents(data.incidents || []))
      .catch(() => {});
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-detected issues grouped by error fingerprint
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['', 'open', 'resolved', 'ignored'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === status
                  ? 'bg-[var(--sibyl)]/10 text-[var(--sibyl)]'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <AlertTriangle size={32} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No incidents found</h3>
          <p className="text-sm text-muted-foreground">
            Incidents will appear here once your services start sending telemetry.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.map((incident: any) => {
            const colors = levelColors[incident.level as keyof typeof levelColors] || levelColors.info;
            return (
              <Link
                key={incident.id}
                href={`/dashboard/incidents/${incident.id}`}
                className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-[var(--sibyl)]/20 transition-all group"
              >
                <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', colors.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-[var(--sibyl)] transition-colors">
                    {incident.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
                      {incident.level}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {new Date(incident.lastSeen).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {incident.eventCount} events
                    </span>
                    {incident.affectedUsers > 0 && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users size={10} /> {incident.affectedUsers} users
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn(
                  'text-[11px] font-medium px-2 py-1 rounded-lg capitalize',
                  incident.status === 'open' ? 'bg-[var(--error)]/10 text-[var(--error)]'
                    : incident.status === 'resolved' ? 'bg-[var(--success)]/10 text-[var(--success)]'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {incident.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
