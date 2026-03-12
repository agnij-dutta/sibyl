// ---------------------------------------------------------------------------
// Investigation Context Builder
// ---------------------------------------------------------------------------
// Assembles a rich context for AI investigation by querying multiple data
// sources: ClickHouse (events, spans), Qdrant (semantic search), and
// PostgreSQL (deploys, incidents). The assembled context is formatted as
// structured evidence for the Gemini reasoning prompt.
// ---------------------------------------------------------------------------

import { queryClickHouse } from './clickhouse.js';
import { searchVectors } from './qdrant.js';
import { generateEmbedding } from './gemini.js';
import { correlateDeployAndErrors, detectServiceCascade } from './correlator.js';
import { getDb } from '@sibyl/db';
import { deploys, incidents } from '@sibyl/db';
import { eq, desc } from 'drizzle-orm';
import { config } from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Evidence {
  type: 'log' | 'trace' | 'deploy' | 'metric' | 'incident' | 'correlation';
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  severity?: 'error' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
}

export interface InvestigationContext {
  // Formatted prompt section for the AI
  promptContext: string;
  // Structured evidence for the frontend
  evidence: Evidence[];
  // Correlation results
  correlations: string[];
}

// ---------------------------------------------------------------------------
// Main context builder
// ---------------------------------------------------------------------------

export async function buildInvestigationContext(
  projectId: string,
  query: string,
): Promise<InvestigationContext> {
  const evidence: Evidence[] = [];
  const contextSections: string[] = [];
  const correlations: string[] = [];

  // Run all queries in parallel for speed
  const [
    recentErrors,
    recentSpans,
    similarEvents,
    recentDeploys,
    openIncidents,
  ] = await Promise.all([
    getRecentErrors(projectId).catch(() => []),
    getErrorSpans(projectId).catch(() => []),
    getSemanticallySimilarEvents(projectId, query).catch(() => []),
    getRecentDeploys(projectId).catch(() => []),
    getOpenIncidents(projectId).catch(() => []),
  ]);

  // --- Recent Errors (ClickHouse) ---
  if (recentErrors.length > 0) {
    contextSections.push(formatErrorsSection(recentErrors));
    for (const err of recentErrors.slice(0, 10)) {
      evidence.push({
        type: 'log',
        id: err.event_id,
        title: `[${err.level}] ${err.service}`,
        preview: err.message.slice(0, 200),
        timestamp: err.timestamp,
        severity: err.level as 'error' | 'warning' | 'info',
        metadata: { fingerprint: err.fingerprint, service: err.service },
      });
    }
  }

  // --- Error Spans (ClickHouse) ---
  if (recentSpans.length > 0) {
    contextSections.push(formatSpansSection(recentSpans));
    for (const span of recentSpans.slice(0, 8)) {
      evidence.push({
        type: 'trace',
        id: span.span_id,
        title: `${span.service} / ${span.operation}`,
        preview: `Duration: ${(span.duration_us / 1000).toFixed(1)}ms | Status: ${span.status}`,
        timestamp: span.start_time,
        severity: span.status === 'error' ? 'error' : undefined,
        metadata: { trace_id: span.trace_id, duration_us: span.duration_us },
      });
    }
  }

  // --- Semantically Similar Events (Qdrant) ---
  if (similarEvents.length > 0) {
    contextSections.push(formatSimilarEventsSection(similarEvents));
  }

  // --- Recent Deploys (PostgreSQL) ---
  if (recentDeploys.length > 0) {
    contextSections.push(formatDeploysSection(recentDeploys));
    for (const deploy of recentDeploys.slice(0, 5)) {
      evidence.push({
        type: 'deploy',
        id: deploy.id,
        title: `Deploy ${deploy.version}`,
        preview: deploy.commitMessage || `Deployed to ${deploy.environment}`,
        timestamp: deploy.deployedAt?.toISOString() || deploy.createdAt.toISOString(),
        metadata: { environment: deploy.environment, commitSha: deploy.commitSha },
      });
    }
  }

  // --- Open Incidents (PostgreSQL) ---
  if (openIncidents.length > 0) {
    contextSections.push(formatIncidentsSection(openIncidents));
    for (const incident of openIncidents.slice(0, 5)) {
      evidence.push({
        type: 'incident',
        id: incident.id,
        title: incident.title,
        preview: `${incident.eventCount} events | ${incident.affectedUsers} users affected`,
        timestamp: incident.lastSeen?.toISOString() || incident.createdAt.toISOString(),
        severity: incident.level as 'error' | 'warning' | 'info',
      });
    }
  }

  // --- Cross-signal Correlation ---
  if (recentDeploys.length > 0 && recentErrors.length > 0) {
    const deployCorrelation = correlateDeployAndErrors(
      recentDeploys.map(d => ({
        version: d.version,
        deployedAt: d.deployedAt || d.createdAt,
      })),
      buildErrorTimeline(recentErrors),
    );
    if (deployCorrelation) {
      correlations.push(deployCorrelation.description);
      contextSections.push(`\n## Correlation: Deploy ↔ Error Spike\n${deployCorrelation.description}\nConfidence: ${(deployCorrelation.confidence * 100).toFixed(0)}%`);
    }
  }

  if (recentSpans.length > 0) {
    const cascade = detectServiceCascade(
      recentSpans.map(s => ({
        service: s.service,
        status: s.status,
        start_time: new Date(s.start_time),
        duration_us: Number(s.duration_us),
      })),
    );
    if (cascade) {
      correlations.push(cascade.description);
      contextSections.push(`\n## Correlation: Service Cascade\n${cascade.description}\nConfidence: ${(cascade.confidence * 100).toFixed(0)}%`);
    }
  }

  // --- Build final prompt context ---
  const promptContext = contextSections.length > 0
    ? `# Telemetry Evidence\n\n${contextSections.join('\n\n---\n\n')}`
    : 'No telemetry data is available for this project yet. Please reason based on general SRE expertise.';

  return { promptContext, evidence, correlations };
}

// ---------------------------------------------------------------------------
// Data Fetching Helpers
// ---------------------------------------------------------------------------

async function getRecentErrors(projectId: string): Promise<any[]> {
  return queryClickHouse(`
    SELECT event_id, timestamp, level, service, environment, message, fingerprint, trace_id
    FROM events
    WHERE project_id = '${projectId}'
      AND level IN ('error', 'warning')
      AND timestamp > now() - INTERVAL 2 HOUR
    ORDER BY timestamp DESC
    LIMIT 50
  `);
}

async function getErrorSpans(projectId: string): Promise<any[]> {
  return queryClickHouse(`
    SELECT trace_id, span_id, parent_span_id, service, operation, kind, status, start_time, duration_us
    FROM spans
    WHERE project_id = '${projectId}'
      AND (status = 'error' OR duration_us > 5000000)
      AND start_time > now() - INTERVAL 2 HOUR
    ORDER BY start_time DESC
    LIMIT 30
  `);
}

async function getSemanticallySimilarEvents(projectId: string, query: string): Promise<any[]> {
  if (!config.gemini.apiKey) return [];

  try {
    const queryEmbedding = await generateEmbedding(query);
    const results = await searchVectors(queryEmbedding, 20, {
      must: [{ key: 'project_id', match: { value: projectId } }],
    });
    return results;
  } catch {
    return [];
  }
}

async function getRecentDeploys(projectId: string): Promise<any[]> {
  try {
    const db = getDb(config.database.url);
    return db
      .select()
      .from(deploys)
      .where(eq(deploys.projectId, projectId))
      .orderBy(desc(deploys.createdAt))
      .limit(10);
  } catch {
    return [];
  }
}

async function getOpenIncidents(projectId: string): Promise<any[]> {
  try {
    const db = getDb(config.database.url);
    return db
      .select()
      .from(incidents)
      .where(eq(incidents.projectId, projectId))
      .orderBy(desc(incidents.lastSeen))
      .limit(10);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

function formatErrorsSection(errors: any[]): string {
  const grouped = new Map<string, any[]>();
  for (const e of errors) {
    const key = e.fingerprint;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  let section = `## Recent Errors (last 2 hours)\n\n`;
  section += `Total: ${errors.length} events across ${grouped.size} unique error types\n\n`;

  for (const [fp, events] of [...grouped.entries()].slice(0, 10)) {
    const sample = events[0];
    section += `### [${sample.level.toUpperCase()}] ${sample.service} (${events.length}x)\n`;
    section += `Fingerprint: ${fp}\n`;
    section += `Message: ${sample.message.slice(0, 300)}\n`;
    section += `First: ${events[events.length - 1].timestamp} | Last: ${events[0].timestamp}\n\n`;
  }

  return section;
}

function formatSpansSection(spans: any[]): string {
  let section = `## Error & Slow Spans (last 2 hours)\n\n`;
  section += `Total: ${spans.length} problematic spans\n\n`;

  for (const span of spans.slice(0, 15)) {
    const durationMs = (Number(span.duration_us) / 1000).toFixed(1);
    section += `- **${span.service}/${span.operation}** [${span.status}] ${durationMs}ms`;
    section += ` (trace: ${span.trace_id.slice(0, 8)}...)\n`;
  }

  return section;
}

function formatSimilarEventsSection(events: any[]): string {
  let section = `## Semantically Similar Past Events\n\n`;

  for (const event of events.slice(0, 10)) {
    const payload = event.payload || {};
    section += `- [${payload.level || '?'}] ${payload.service || '?'}: ${(payload.message || '').slice(0, 200)}`;
    section += ` (similarity: ${(event.score * 100).toFixed(0)}%)\n`;
  }

  return section;
}

function formatDeploysSection(deployList: any[]): string {
  let section = `## Recent Deploys\n\n`;

  for (const d of deployList.slice(0, 10)) {
    section += `- **${d.version}** to ${d.environment}`;
    if (d.commitMessage) section += ` — "${d.commitMessage.slice(0, 100)}"`;
    section += ` (${d.deployedAt || d.createdAt})\n`;
  }

  return section;
}

function formatIncidentsSection(incidentList: any[]): string {
  let section = `## Open Incidents\n\n`;

  for (const i of incidentList) {
    section += `- **${i.title.slice(0, 150)}** [${i.level}/${i.status}]`;
    section += ` — ${i.eventCount} events, ${i.affectedUsers} users affected\n`;
  }

  return section;
}

function buildErrorTimeline(errors: any[]): { timestamp: Date; count: number }[] {
  const buckets = new Map<string, number>();
  for (const e of errors) {
    const time = e.timestamp.slice(0, 16); // Group by minute
    buckets.set(time, (buckets.get(time) || 0) + 1);
  }
  return [...buckets.entries()].map(([t, c]) => ({
    timestamp: new Date(t),
    count: c,
  }));
}
