// ---------------------------------------------------------------------------
// Incident Detector Worker
// ---------------------------------------------------------------------------
// Background worker that groups error/warning events by fingerprint and
// creates or updates incidents in PostgreSQL. Polls ClickHouse every 60
// seconds for new fingerprint groups, then upserts matching incidents via
// Drizzle ORM against the Neon Postgres database.
// ---------------------------------------------------------------------------

import { getDb } from '@sibyl/db';
import { incidents } from '@sibyl/db';
import { eq, and } from 'drizzle-orm';
import { queryClickHouse } from '../lib/clickhouse.js';
import { config } from '../config.js';

const INTERVAL_MS = 60_000; // 1 minute
let lastRunAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

interface FingerprintGroup {
  project_id: string;
  fingerprint: string;
  level: string;
  count: number;
  latest_message: string;
  latest_timestamp: string;
  unique_users: number;
}

/**
 * Query ClickHouse for fingerprint groups since the last run, then create or
 * update corresponding incident records in PostgreSQL.
 *
 * @returns The number of newly created incidents.
 */
export async function detectIncidents(): Promise<number> {
  // Query ClickHouse for fingerprint groups since last run
  const groups: FingerprintGroup[] = await queryClickHouse(`
    SELECT
      project_id,
      fingerprint,
      any(level) as level,
      count() as count,
      any(message) as latest_message,
      max(timestamp) as latest_timestamp,
      uniqExact(user_id) as unique_users
    FROM events
    WHERE timestamp > '${lastRunAt}'
      AND level IN ('error', 'warning')
    GROUP BY project_id, fingerprint
    HAVING count >= 1
    ORDER BY count DESC
    LIMIT 100
  `);

  if (!groups || groups.length === 0) return 0;

  const db = getDb(config.database.url);
  let created = 0;

  for (const group of groups) {
    try {
      // Check if incident already exists for this fingerprint
      const existing = await db
        .select()
        .from(incidents)
        .where(
          and(
            eq(incidents.projectId, group.project_id),
            eq(incidents.fingerprint, group.fingerprint)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing incident
        const incident = existing[0];
        await db
          .update(incidents)
          .set({
            lastSeen: new Date(group.latest_timestamp),
            eventCount: (incident.eventCount || 0) + Number(group.count),
            affectedUsers: Math.max(incident.affectedUsers || 0, Number(group.unique_users)),
          })
          .where(eq(incidents.id, incident.id));
      } else {
        // Create new incident
        // Truncate message for title (first line, max 200 chars)
        const title = group.latest_message.split('\n')[0].slice(0, 200);

        await db.insert(incidents).values({
          projectId: group.project_id,
          fingerprint: group.fingerprint,
          title,
          level: group.level as 'error' | 'warning' | 'info',
          status: 'open',
          firstSeen: new Date(group.latest_timestamp),
          lastSeen: new Date(group.latest_timestamp),
          eventCount: Number(group.count),
          affectedUsers: Number(group.unique_users),
          metadata: {},
        });
        created++;
      }
    } catch (err) {
      console.error(`[incident-detector] Failed for fingerprint ${group.fingerprint}:`, err);
    }
  }

  lastRunAt = new Date().toISOString();
  if (created > 0) {
    console.log(`[incident-detector] Created ${created} new incidents, updated ${groups.length - created}`);
  }
  return created;
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the incident detector on a recurring 60-second interval.
 */
export function startIncidentDetector(): void {
  console.log('[incident-detector] Starting (interval: 60s)');

  detectIncidents().catch(console.error);

  timer = setInterval(async () => {
    try {
      await detectIncidents();
    } catch (err) {
      console.error('[incident-detector] Tick error:', err);
    }
  }, INTERVAL_MS);

  if (timer && 'unref' in timer) timer.unref();
}

/**
 * Stop the incident detector and clear its interval timer.
 */
export function stopIncidentDetector(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
