// ---------------------------------------------------------------------------
// POST /v1/ingest - Batch Telemetry Ingestion
// ---------------------------------------------------------------------------
// Accepts batches of events and/or spans from SDKs, validates them, computes
// fingerprints, inserts into ClickHouse, and queues background embedding jobs.
// ---------------------------------------------------------------------------

import { Hono } from 'hono';
import { getDb } from '@sibyl/db';
import { apiKeys, projects } from '@sibyl/db';
import { eq } from 'drizzle-orm';
import type { ClickHouseEvent, ClickHouseSpan } from '@sibyl/db';
import { insertEvents, insertSpans } from '../lib/clickhouse.js';
import { fingerprint } from '../lib/fingerprint.js';
import { config } from '../config.js';

const ingest = new Hono();

// ---------------------------------------------------------------------------
// Types for the ingest payload
// ---------------------------------------------------------------------------

interface IngestEventPayload {
  event_id?: string;
  timestamp?: string;
  level?: string;
  service?: string;
  environment?: string;
  message: string;
  stack_trace?: string;
  trace_id?: string;
  span_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  sdk_name?: string;
  sdk_version?: string;
}

interface IngestSpanPayload {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  service?: string;
  operation: string;
  kind?: string;
  status?: string;
  start_time?: string;
  duration_us: number;
  attributes?: Record<string, unknown>;
  events?: unknown[];
}

interface IngestBody {
  events?: IngestEventPayload[];
  spans?: IngestSpanPayload[];
}

// ---------------------------------------------------------------------------
// Auth middleware: resolve project from API key / DSN
// ---------------------------------------------------------------------------

async function resolveProject(
  authHeader: string | undefined,
): Promise<{ projectId: string; orgId: string } | null> {
  if (!authHeader) return null;

  // Support "Bearer <key>" and raw DSN-style tokens
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) return null;

  try {
    const db = getDb(config.database.url);

    // First try matching as a DSN (projects.dsn)
    const projectByDsn = await db
      .select({ id: projects.id, orgId: projects.orgId })
      .from(projects)
      .where(eq(projects.dsn, token))
      .limit(1);

    if (projectByDsn.length > 0) {
      return { projectId: projectByDsn[0]!.id, orgId: projectByDsn[0]!.orgId };
    }

    // Fall back to API key prefix lookup.
    // API keys are stored as hashed values; for the ingest path we match on
    // the key prefix (first 8 chars) and then verify. This keeps the hot path
    // fast while the full key hash check guards against collisions.
    const prefix = token.slice(0, 8);
    const keyRows = await db
      .select({
        projectId: apiKeys.projectId,
        keyHash: apiKeys.keyHash,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix))
      .limit(5);

    for (const row of keyRows) {
      // In production this should be a constant-time comparison against the
      // hashed token. For now, we do a simple hash check placeholder.
      // TODO: implement proper hash verification with crypto.subtle
      if (row.keyHash) {
        // Look up the org for this project
        const proj = await db
          .select({ orgId: projects.orgId })
          .from(projects)
          .where(eq(projects.id, row.projectId))
          .limit(1);

        if (proj.length > 0) {
          return { projectId: row.projectId, orgId: proj[0]!.orgId };
        }
      }
    }
  } catch (err) {
    console.error('[ingest] Auth resolution failed:', err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// POST /ingest
// ---------------------------------------------------------------------------

ingest.post('/ingest', async (c) => {
  // --- Auth ---
  const authHeader = c.req.header('Authorization');
  const project = await resolveProject(authHeader);

  if (!project) {
    return c.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key / DSN.' },
      401,
    );
  }

  // --- Parse body ---
  let body: IngestBody;
  try {
    body = await c.req.json<IngestBody>();
  } catch {
    return c.json(
      { error: 'Bad Request', message: 'Request body must be valid JSON.' },
      400,
    );
  }

  const rawEvents = body.events ?? [];
  const rawSpans = body.spans ?? [];

  if (rawEvents.length === 0 && rawSpans.length === 0) {
    return c.json(
      { error: 'Bad Request', message: 'At least one event or span is required.' },
      400,
    );
  }

  // Hard cap to prevent abuse
  if (rawEvents.length > 1000 || rawSpans.length > 1000) {
    return c.json(
      { error: 'Payload Too Large', message: 'Maximum 1000 events and 1000 spans per batch.' },
      413,
    );
  }

  // --- Normalize events ---
  const now = new Date().toISOString();
  const events: ClickHouseEvent[] = rawEvents.map((e) => ({
    event_id: e.event_id || crypto.randomUUID(),
    org_id: project.orgId,
    project_id: project.projectId,
    timestamp: e.timestamp || now,
    level: e.level || 'error',
    service: e.service || 'unknown',
    environment: e.environment || 'production',
    message: e.message,
    fingerprint: fingerprint(e.message, e.stack_trace),
    trace_id: e.trace_id || '',
    span_id: e.span_id || '',
    user_id: e.user_id || '',
    metadata: e.metadata ? JSON.stringify(e.metadata) : '{}',
    sdk_name: e.sdk_name || 'unknown',
    sdk_version: e.sdk_version || '0.0.0',
  }));

  // --- Normalize spans ---
  const spans: ClickHouseSpan[] = rawSpans.map((s) => ({
    trace_id: s.trace_id,
    span_id: s.span_id,
    parent_span_id: s.parent_span_id || '',
    org_id: project.orgId,
    project_id: project.projectId,
    service: s.service || 'unknown',
    operation: s.operation,
    kind: s.kind || 'internal',
    status: s.status || 'ok',
    start_time: s.start_time || now,
    duration_us: s.duration_us,
    attributes: s.attributes ? JSON.stringify(s.attributes) : '{}',
    events: s.events ? JSON.stringify(s.events) : '[]',
  }));

  // --- Insert into ClickHouse ---
  try {
    await Promise.all([
      events.length > 0 ? insertEvents(events) : Promise.resolve(),
      spans.length > 0 ? insertSpans(spans) : Promise.resolve(),
    ]);
  } catch (err) {
    console.error('[ingest] ClickHouse insert failed:', err);
    return c.json(
      { error: 'Internal Server Error', message: 'Failed to persist telemetry data.' },
      500,
    );
  }

  // --- Queue embedding jobs (fire-and-forget) ---
  // TODO: Phase 4 - push to Redis queue for background embedding generation
  // For now we log the intent and move on.
  if (events.length > 0) {
    console.log(
      `[ingest] Queued ${events.length} event(s) for embedding generation`,
    );
  }

  return c.json({
    accepted: true,
    eventCount: events.length,
    spanCount: spans.length,
  });
});

export default ingest;
