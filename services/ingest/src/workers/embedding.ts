// ---------------------------------------------------------------------------
// Embedding Worker
// ---------------------------------------------------------------------------
// Background worker that generates embeddings for new events and stores them
// in Qdrant for semantic search. Polls ClickHouse on a 30-second interval,
// batches events, generates embeddings via Gemini text-embedding-004, and
// upserts the resulting vectors with event metadata as payload.
// ---------------------------------------------------------------------------

import { config } from '../config.js';
import { queryClickHouse } from '../lib/clickhouse.js';
import { generateEmbeddingBatch } from '../lib/gemini.js';
import { upsertVectors } from '../lib/qdrant.js';

const BATCH_SIZE = 20;
const INTERVAL_MS = 30_000; // 30 seconds

// Track last processed timestamp to avoid re-processing
let lastProcessedTimestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Start 1hr ago

/**
 * Query recent un-embedded events from ClickHouse, generate embeddings via
 * Gemini, and upsert them into Qdrant.
 *
 * @returns The number of events successfully embedded in this batch.
 */
export async function processEmbeddingBatch(): Promise<number> {
  // Query recent events from ClickHouse that haven't been embedded yet
  const events = await queryClickHouse(`
    SELECT event_id, org_id, project_id, timestamp, level, service, message, fingerprint
    FROM events
    WHERE timestamp > '${lastProcessedTimestamp}'
    ORDER BY timestamp ASC
    LIMIT ${BATCH_SIZE}
  `);

  if (!events || events.length === 0) return 0;

  // Build text for embedding: combine service, level, and message
  const texts = events.map((e: any) =>
    `[${e.level}] ${e.service}: ${e.message}`
  );

  try {
    const embeddings = await generateEmbeddingBatch(texts);

    // Prepare Qdrant points
    const points = events.map((e: any, i: number) => ({
      id: e.event_id,
      vector: embeddings[i],
      payload: {
        org_id: e.org_id,
        project_id: e.project_id,
        timestamp: e.timestamp,
        level: e.level,
        service: e.service,
        message: e.message,
        fingerprint: e.fingerprint,
      },
    }));

    await upsertVectors(points);

    // Update last processed timestamp
    const lastEvent = events[events.length - 1];
    lastProcessedTimestamp = lastEvent.timestamp as string;

    console.log(`[embedding-worker] Embedded ${events.length} events`);
    return events.length;
  } catch (err) {
    console.error('[embedding-worker] Failed:', err);
    return 0;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the embedding worker on a recurring interval.
 * If no GEMINI_API_KEY is configured the worker is silently disabled.
 */
export function startEmbeddingWorker(): void {
  if (!config.gemini.apiKey) {
    console.warn('[embedding-worker] No GEMINI_API_KEY — worker disabled');
    return;
  }

  console.log('[embedding-worker] Starting (interval: 30s)');

  // Run immediately, then on interval
  processEmbeddingBatch().catch(console.error);

  timer = setInterval(async () => {
    try {
      await processEmbeddingBatch();
    } catch (err) {
      console.error('[embedding-worker] Tick error:', err);
    }
  }, INTERVAL_MS);

  // Don't prevent process exit
  if (timer && 'unref' in timer) timer.unref();
}

/**
 * Stop the embedding worker and clear its interval timer.
 */
export function stopEmbeddingWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
