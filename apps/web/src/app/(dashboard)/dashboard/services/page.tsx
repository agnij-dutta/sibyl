'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Network,
  Grid,
  GitBranch,
  Activity,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/dashboard/Sparkline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Service {
  name: string;
  spanCount: number;
  errorCount: number;
  errorRate: string;
  avgDurationMs: number;
  lastSeen: string;
}

type ViewMode = 'grid' | 'map';

type HealthStatus = 'healthy' | 'degraded' | 'critical';

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  health: HealthStatus;
  service: Service;
}

interface GraphEdge {
  source: string;
  target: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHealthStatus(errorRate: string | number): HealthStatus {
  const rate = typeof errorRate === 'string' ? parseFloat(errorRate) : errorRate;
  if (rate < 1) return 'healthy';
  if (rate <= 5) return 'degraded';
  return 'critical';
}

function getHealthColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'var(--success)';
    case 'degraded':
      return 'var(--warning)';
    case 'critical':
      return 'var(--error)';
  }
}

function getStatusDotClass(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-[var(--success)]';
    case 'degraded':
      return 'bg-[var(--warning)]';
    case 'critical':
      return 'bg-[var(--error)]';
  }
}

/** Generate mock sparkline data for a service's request volume trend. */
function generateServiceSparkline(spanCount: number): number[] {
  const points = 12;
  const data: number[] = [];
  let current = spanCount * 0.4;
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * spanCount * 0.25;
    const drift = (spanCount * 0.5 * i) / points;
    current = Math.max(0, spanCount * 0.3 + drift + noise);
    data.push(Math.round(current));
  }
  data[data.length - 1] = spanCount;
  return data;
}

/**
 * Derive dependency edges from service names using common naming patterns.
 * This is a heuristic that maps gateway/frontend services to backends,
 * and service-to-service relationships based on naming conventions.
 */
function deriveEdges(services: Service[]): GraphEdge[] {
  const names = services.map((s) => s.name.toLowerCase());
  const edges: GraphEdge[] = [];
  const added = new Set<string>();

  const addEdge = (source: string, target: string) => {
    const key = `${source}::${target}`;
    const reverseKey = `${target}::${source}`;
    if (!added.has(key) && !added.has(reverseKey) && source !== target) {
      added.add(key);
      edges.push({
        source: services.find((s) => s.name.toLowerCase() === source)!.name,
        target: services.find((s) => s.name.toLowerCase() === target)!.name,
      });
    }
  };

  // Gateway/frontend connects to everything else
  const gatewayPatterns = ['gateway', 'api-gateway', 'frontend', 'bff', 'proxy', 'ingress', 'edge'];
  const gateways = names.filter((n) =>
    gatewayPatterns.some((p) => n.includes(p))
  );

  // Known domain pairings
  const pairings: [string, string[]][] = [
    ['order', ['payment', 'inventory', 'shipping', 'notification', 'product', 'catalog']],
    ['user', ['auth', 'notification', 'email', 'profile']],
    ['auth', ['user', 'session', 'token']],
    ['payment', ['billing', 'notification', 'ledger']],
    ['cart', ['order', 'product', 'inventory', 'catalog']],
    ['product', ['inventory', 'catalog', 'search']],
    ['search', ['product', 'catalog', 'elasticsearch']],
    ['notification', ['email', 'sms', 'push']],
    ['shipping', ['tracking', 'notification']],
    ['billing', ['payment', 'invoice']],
  ];

  for (const gw of gateways) {
    for (const name of names) {
      if (name !== gw && !gatewayPatterns.some((p) => name.includes(p))) {
        addEdge(gw, name);
      }
    }
  }

  for (const [domain, targets] of pairings) {
    const sources = names.filter((n) => n.includes(domain));
    for (const src of sources) {
      for (const tgt of targets) {
        const matches = names.filter((n) => n.includes(tgt) && n !== src);
        for (const m of matches) {
          addEdge(src, m);
        }
      }
    }
  }

  // If we still have no edges and there are 2+ services, create a simple chain
  if (edges.length === 0 && services.length >= 2) {
    for (let i = 0; i < services.length - 1; i++) {
      edges.push({
        source: services[i].name,
        target: services[i + 1].name,
      });
    }
  }

  return edges;
}

/**
 * Arrange services in a circular layout and produce graph nodes.
 */
function buildGraphLayout(
  services: Service[],
  width: number,
  height: number
): GraphNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) * 0.35;

  // Node size is based on span count, clamped to a reasonable range
  const maxSpans = Math.max(...services.map((s) => s.spanCount), 1);

  return services.map((service, i) => {
    const angle = (2 * Math.PI * i) / services.length - Math.PI / 2;
    const spanRatio = service.spanCount / maxSpans;
    const nodeRadius = 18 + spanRatio * 22; // 18..40px

    return {
      id: service.name,
      label: service.name,
      x: cx + maxRadius * Math.cos(angle),
      y: cy + maxRadius * Math.sin(angle),
      radius: nodeRadius,
      health: getHealthStatus(service.errorRate),
      service,
    };
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** View toggle buttons */
function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-muted/50 p-1 gap-0.5">
      <button
        onClick={() => onChange('grid')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
          mode === 'grid'
            ? 'bg-[var(--glass-bg)] text-foreground shadow-sm border border-[var(--glass-border)]'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Grid size={13} />
        Grid
      </button>
      <button
        onClick={() => onChange('map')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
          mode === 'map'
            ? 'bg-[var(--glass-bg)] text-foreground shadow-sm border border-[var(--glass-border)]'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <GitBranch size={13} />
        Map
      </button>
    </div>
  );
}

/** Enhanced service card with sparkline and status dot */
function ServiceCard({
  service,
  sparklineData,
  index,
}: {
  service: Service;
  sparklineData: number[];
  index: number;
}) {
  const health = getHealthStatus(service.errorRate);
  const healthColor = getHealthColor(health);

  return (
    <div
      className="glass-card rounded-2xl p-5 opacity-0"
      style={{
        animation: `fade-up 0.4s ease-out ${index * 0.06}s forwards`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--sibyl)]/10 flex items-center justify-center relative">
          <Network size={18} className="text-[var(--sibyl)]" />
          {/* Status dot */}
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--glass-bg)]',
              getStatusDotClass(health)
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{service.name}</p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock size={10} />
            Last seen {service.lastSeen}
          </div>
        </div>
      </div>

      {/* Sparkline: request volume trend */}
      <div className="mb-4 px-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Request Volume
          </span>
          <Activity size={10} className="text-muted-foreground" />
        </div>
        <Sparkline
          data={sparklineData}
          width={240}
          height={28}
          color={healthColor}
          fillOpacity={0.12}
          className="w-full"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="number-display text-lg font-bold">{service.spanCount}</p>
          <p className="text-[11px] text-muted-foreground">Spans</p>
        </div>
        <div>
          <p
            className={cn(
              'number-display text-lg font-bold',
              service.errorCount > 0 ? 'text-[var(--error)]' : ''
            )}
          >
            {service.errorCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Errors</p>
        </div>
        <div>
          <p className="number-display text-lg font-bold">
            {service.avgDurationMs}ms
          </p>
          <p className="text-[11px] text-muted-foreground">Avg latency</p>
        </div>
      </div>

      {/* Error rate alert badge */}
      {parseFloat(service.errorRate) > 5 && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--error)]/[0.06] flex items-center gap-2">
          <AlertTriangle size={12} className="text-[var(--error)]" />
          <span className="text-[11px] text-[var(--error)] font-medium">
            {service.errorRate}% error rate
          </span>
        </div>
      )}
      {parseFloat(service.errorRate) >= 1 &&
        parseFloat(service.errorRate) <= 5 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--warning)]/[0.06] flex items-center gap-2">
            <AlertTriangle size={12} className="text-[var(--warning)]" />
            <span className="text-[11px] text-[var(--warning)] font-medium">
              {service.errorRate}% error rate
            </span>
          </div>
        )}
    </div>
  );
}

/** SVG dependency graph visualization */
function DependencyMap({ services }: { services: Service[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Measure container on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({
        width: Math.max(rect.width, 400),
        height: Math.max(rect.height, 400),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    // Trigger fade-in after a brief delay
    const timer = setTimeout(() => setMounted(true), 50);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const nodes = useMemo(
    () => buildGraphLayout(services, dimensions.width, dimensions.height),
    [services, dimensions]
  );

  const edges = useMemo(() => deriveEdges(services), [services]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  // Edges connected to the hovered node
  const highlightedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<number>();
    const set = new Set<number>();
    edges.forEach((e, i) => {
      if (e.source === hoveredNode || e.target === hoveredNode) set.add(i);
    });
    return set;
  }, [hoveredNode, edges]);

  // Nodes connected to the hovered node
  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const set = new Set<string>();
    set.add(hoveredNode);
    edges.forEach((e) => {
      if (e.source === hoveredNode) set.add(e.target);
      if (e.target === hoveredNode) set.add(e.source);
    });
    return set;
  }, [hoveredNode, edges]);

  // No-dependency placeholder
  if (services.length < 2) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <GitBranch size={32} className="mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Dependency map requires 2+ services</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The dependency map visualizes connections between your services.
          Once you have multiple services sending telemetry data, their
          relationships will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="glass-card rounded-2xl overflow-hidden relative"
      style={{ minHeight: 500 }}
    >
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3 flex items-center justify-between border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-[var(--sibyl)]" />
          <span className="text-xs font-semibold">Service Dependency Map</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            Healthy (&lt;1%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
            Degraded (1-5%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--error)]" />
            Critical (&gt;5%)
          </span>
        </div>
      </div>

      {/* Dot pattern background */}
      <div className="absolute inset-0 dot-pattern opacity-40" />

      {/* SVG graph */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="relative z-[1]"
        style={{ paddingTop: 48 }}
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="var(--muted-foreground)"
              opacity="0.4"
            />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="var(--sibyl)"
              opacity="0.8"
            />
          </marker>

          {/* Glow filters for each health state */}
          <filter id="glow-healthy" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="var(--success)" floodOpacity="0.3" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-degraded" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="var(--warning)" floodOpacity="0.3" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-critical" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="var(--error)" floodOpacity="0.3" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return null;

          const isHighlighted = highlightedEdges.has(i);
          const isDimmed = hoveredNode !== null && !isHighlighted;

          // Calculate line endpoint offset to stop at node border
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;

          const x1 = src.x + nx * src.radius;
          const y1 = src.y + ny * src.radius;
          const x2 = tgt.x - nx * tgt.radius;
          const y2 = tgt.y - ny * tgt.radius;

          return (
            <line
              key={`edge-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHighlighted ? 'var(--sibyl)' : 'var(--muted-foreground)'}
              strokeWidth={isHighlighted ? 2 : 1}
              strokeOpacity={isDimmed ? 0.1 : isHighlighted ? 0.8 : 0.25}
              markerEnd={
                isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead)'
              }
              style={{
                transition: 'stroke-opacity 0.25s ease, stroke-width 0.25s ease, stroke 0.25s ease',
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const color = getHealthColor(node.health);
          const isHovered = hoveredNode === node.id;
          const isConnected = connectedNodes.has(node.id);
          const isDimmed =
            hoveredNode !== null && !isHovered && !isConnected;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                cursor: 'pointer',
                opacity: mounted ? (isDimmed ? 0.25 : 1) : 0,
                transition: `opacity 0.4s ease ${i * 0.06}s, transform 0.2s ease`,
                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                transformOrigin: `${node.x}px ${node.y}px`,
              }}
            >
              {/* Outer ring on hover */}
              {isHovered && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                  strokeDasharray="4 3"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="14"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={color}
                fillOpacity={isHovered ? 0.25 : 0.12}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeOpacity={isHovered ? 0.9 : 0.5}
                filter={
                  isHovered
                    ? `url(#glow-${node.health})`
                    : undefined
                }
                style={{
                  transition:
                    'fill-opacity 0.2s ease, stroke-width 0.2s ease, stroke-opacity 0.2s ease',
                }}
              />

              {/* Inner dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r={4}
                fill={color}
                fillOpacity={0.8}
              />

              {/* Label */}
              <text
                x={node.x}
                y={node.y + node.radius + 16}
                textAnchor="middle"
                className="fill-foreground"
                style={{
                  fontSize: '11px',
                  fontWeight: isHovered ? 600 : 500,
                  fontFamily: 'Outfit, sans-serif',
                  transition: 'font-weight 0.2s ease',
                }}
              >
                {node.label}
              </text>

              {/* Span count badge under label */}
              <text
                x={node.x}
                y={node.y + node.radius + 29}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{
                  fontSize: '9px',
                  fontFamily: 'Space Mono, monospace',
                }}
              >
                {node.service.spanCount} spans
              </text>

              {/* Tooltip on hover */}
              {isHovered && (
                <foreignObject
                  x={node.x - 90}
                  y={node.y - node.radius - 80}
                  width={180}
                  height={70}
                  style={{ pointerEvents: 'none' }}
                >
                  <div
                    className="glass-card rounded-xl px-3 py-2 text-center"
                    style={{ fontSize: '10px' }}
                  >
                    <div className="font-semibold text-foreground text-[11px] mb-1">
                      {node.label}
                    </div>
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <span>
                        <span className="font-mono font-bold text-foreground">
                          {node.service.errorRate}%
                        </span>{' '}
                        err
                      </span>
                      <span>
                        <span className="font-mono font-bold text-foreground">
                          {node.service.avgDurationMs}
                        </span>
                        ms
                      </span>
                    </div>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {/* Dependency info note */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-5 py-2.5 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]">
        <p className="text-[10px] text-muted-foreground text-center">
          Dependencies are inferred from service naming patterns. Connect OpenTelemetry with span links for precise dependency data.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    fetch('/api/services', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
      .catch(() => {});
  }, []);

  // Pre-compute sparkline data so it is stable across renders
  const sparklineMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const svc of services) {
      map.set(svc.name, generateServiceSparkline(svc.spanCount));
    }
    return map;
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-discovered services from your telemetry data
          </p>
        </div>
        {services.length > 0 && (
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        )}
      </div>

      {/* Empty state */}
      {services.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Network
            size={32}
            className="mx-auto text-muted-foreground mb-3"
          />
          <h3 className="font-semibold mb-1">No services discovered</h3>
          <p className="text-sm text-muted-foreground">
            Services are auto-discovered from trace data. Start sending spans
            to see your service map.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid view ──────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <ServiceCard
              key={service.name}
              service={service}
              sparklineData={sparklineMap.get(service.name) || []}
              index={i}
            />
          ))}
        </div>
      ) : (
        /* ── Map view ───────────────────────────────── */
        <DependencyMap services={services} />
      )}
    </div>
  );
}
