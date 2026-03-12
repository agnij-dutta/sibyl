// ---------------------------------------------------------------------------
// ClickHouse Client Wrapper
// ---------------------------------------------------------------------------
// Provides a lazily-initialized singleton ClickHouse client and typed helpers
// for batch-inserting events/spans and running ad-hoc queries.
// ---------------------------------------------------------------------------

import { createClient } from '@clickhouse/client';
import type { ClickHouseEvent, ClickHouseSpan } from '@sibyl/db';
import { config } from '../config.js';

let client: ReturnType<typeof createClient> | null = null;

/**
 * Return the singleton ClickHouse client, creating it on first call.
 */
export function getClickHouse() {
  if (!client) {
    client = createClient({
      url: config.clickhouse.url,
      database: config.clickhouse.database,
      username: config.clickhouse.username,
      password: config.clickhouse.password,
    });
  }
  return client;
}

/**
 * Batch-insert events into the ClickHouse `events` table.
 *
 * Uses JSONEachRow format for maximum throughput. The caller is responsible
 * for ensuring the event objects conform to the ClickHouseEvent interface.
 */
export async function insertEvents(events: ClickHouseEvent[]): Promise<void> {
  if (events.length === 0) return;

  const ch = getClickHouse();
  await ch.insert({
    table: 'events',
    values: events,
    format: 'JSONEachRow',
  });
}

/**
 * Batch-insert spans into the ClickHouse `spans` table.
 */
export async function insertSpans(spans: ClickHouseSpan[]): Promise<void> {
  if (spans.length === 0) return;

  const ch = getClickHouse();
  await ch.insert({
    table: 'spans',
    values: spans,
    format: 'JSONEachRow',
  });
}

/**
 * Execute an arbitrary ClickHouse query and return the result as JSON rows.
 *
 * @param query  - The SQL query string. Use `{param:Type}` placeholders.
 * @param params - Named query parameters.
 */
export async function queryClickHouse<T = Record<string, unknown>>(
  query: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  const ch = getClickHouse();
  const result = await ch.query({
    query,
    query_params: params,
    format: 'JSONEachRow',
  });
  return result.json<T>();
}

/**
 * Gracefully close the ClickHouse connection pool.
 */
export async function closeClickHouse(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
