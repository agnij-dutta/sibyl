'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  AlertTriangle,
  Activity,
  Layers,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { ErrorChart } from '@/components/dashboard/ErrorChart';
import { InvestigationTimeline } from '@/components/dashboard/InvestigationTimeline';

interface DashboardData {
  stats: {
    totalProjects: number;
    totalIncidents: number;
    totalInvestigations: number;
    openIncidents: number;
  };
  recentIncidents: any[];
  recentInvestigations: any[];
  projects: any[];
}

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

/** Generate a sparkline array with a general trend direction. */
function generateSparkline(
  points: number,
  base: number,
  trend: 'up' | 'down' | 'flat'
): number[] {
  const data: number[] = [];
  let current = base * 0.6;
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * base * 0.3;
    const drift =
      trend === 'up'
        ? (base * 0.4 * i) / points
        : trend === 'down'
          ? -(base * 0.3 * i) / points
          : 0;
    current = Math.max(0, current + drift / points + noise);
    data.push(Math.round(current));
  }
  // Ensure the last value is close to the actual stat value
  data[data.length - 1] = base;
  return data;
}

/** Build 24 hours of mock error chart data. */
function generateErrorChartData(): { hour: string; count: number; level: string }[] {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now.getTime() - (23 - i) * 3600_000);
    const hour = h.toLocaleTimeString([], { hour: '2-digit', hour12: false });
    const rand = Math.random();
    const count = Math.floor(Math.random() * 18);
    const level = rand > 0.7 ? 'error' : rand > 0.3 ? 'warning' : 'info';
    return { hour, count, level };
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard', { credentials: 'include' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  // Sparkline data is derived once per data load so it doesn't shuffle on
  // every render.
  const sparklines = useMemo(() => {
    const open = data?.stats.openIncidents ?? 0;
    const inv = data?.stats.totalInvestigations ?? 0;
    const proj = data?.stats.totalProjects ?? 0;
    const total = data?.stats.totalIncidents ?? 0;
    return {
      openIncidents: generateSparkline(12, open || 3, 'down'),
      investigations: generateSparkline(12, inv || 5, 'up'),
      projects: generateSparkline(12, proj || 2, 'up'),
      totalIncidents: generateSparkline(12, total || 8, 'flat'),
    };
  }, [data]);

  const errorChartData = useMemo(() => generateErrorChartData(), []);

  // Map the API investigations into the shape InvestigationTimeline expects.
  const timelineInvestigations = useMemo(() => {
    if (!data?.recentInvestigations) return [];
    return data.recentInvestigations.slice(0, 5).map((inv: any) => ({
      id: inv.id as string,
      query: inv.query as string,
      status: inv.status as 'running' | 'completed' | 'failed',
      confidence: inv.confidence as number | undefined,
      createdAt: (inv.createdAt ?? inv.created_at ?? new Date().toISOString()) as string,
    }));
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your production health
          </p>
        </div>
        <Link
          href="/dashboard/investigate"
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm"
        >
          <Search size={16} />
          <span className="relative z-10">New Investigation</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          label="Open Incidents"
          value={data ? data.stats.openIncidents : '--'}
          icon={AlertTriangle}
          color="var(--error)"
          trend={{ value: 12, label: 'vs last week' }}
          sparklineData={sparklines.openIncidents}
        />
        <StatusCard
          label="Investigations"
          value={data ? data.stats.totalInvestigations : '--'}
          icon={Search}
          color="var(--sibyl)"
          trend={{ value: -8, label: 'vs last week' }}
          sparklineData={sparklines.investigations}
        />
        <StatusCard
          label="Projects"
          value={data ? data.stats.totalProjects : '--'}
          icon={Layers}
          color="var(--info)"
          sparklineData={sparklines.projects}
        />
        <StatusCard
          label="Total Incidents"
          value={data ? data.stats.totalIncidents : '--'}
          icon={Activity}
          color="var(--warning)"
          trend={{ value: 0, label: 'stable' }}
          sparklineData={sparklines.totalIncidents}
        />
      </div>

      {/* Error Trend Chart */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Error Trend (24h)</h2>
          <span className="text-[11px] text-muted-foreground font-mono">
            last 24 hours
          </span>
        </div>
        <ErrorChart data={errorChartData} height={140} />
      </div>

      {/* Two-column grid: Recent Incidents + Investigations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Incidents</h2>
            <Link
              href="/dashboard/incidents"
              className="text-[12px] text-[var(--sibyl)] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {!data?.recentIncidents || data.recentIncidents.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle
                size={24}
                className="mx-auto text-muted-foreground mb-2"
              />
              <p className="text-sm text-muted-foreground">No incidents yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your services to start monitoring
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentIncidents.slice(0, 5).map((incident: any) => (
                <Link
                  key={incident.id}
                  href={`/dashboard/incidents/${incident.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      incident.level === 'error'
                        ? 'bg-[var(--error)]'
                        : 'bg-[var(--warning)]'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {incident.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {incident.eventCount} events
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(incident.lastSeen).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Investigations */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Investigations</h2>
            <Link
              href="/dashboard/investigate"
              className="text-[12px] text-[var(--sibyl)] hover:underline flex items-center gap-1"
            >
              New <ArrowRight size={12} />
            </Link>
          </div>

          {!data?.recentInvestigations ||
          data.recentInvestigations.length === 0 ? (
            <div className="text-center py-8">
              <Search
                size={24}
                className="mx-auto text-muted-foreground mb-2"
              />
              <p className="text-sm text-muted-foreground">
                No investigations yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start an AI investigation to analyze incidents
              </p>
            </div>
          ) : (
            <InvestigationTimeline investigations={timelineInvestigations} />
          )}
        </div>
      </div>

      {/* Empty state: create first project */}
      {data?.projects.length === 0 && (
        <div className="card-premium rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[var(--sibyl)]/10 flex items-center justify-center">
            <Layers size={24} className="text-[var(--sibyl)]" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Create your first project
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Get started by creating a project and connecting your services with
            our SDK. It takes less than 2 minutes.
          </p>
          <Link
            href="/dashboard/settings"
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm"
          >
            <span className="relative z-10">Create Project</span>
            <ArrowRight size={14} className="relative z-10" />
          </Link>
        </div>
      )}
    </div>
  );
}
