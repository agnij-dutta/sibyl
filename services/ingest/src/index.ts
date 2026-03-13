// ---------------------------------------------------------------------------
// Sibyl Ingest Service - Entry Point
// ---------------------------------------------------------------------------
// Hono-based HTTP server responsible for telemetry ingestion, AI-powered
// investigation streaming, and health checks. Runs as a standalone Node.js
// process separate from the Next.js web application.
// ---------------------------------------------------------------------------

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { config, validateConfig } from './config.js';
import health from './routes/health.js';
import ingest from './routes/ingest.js';
import investigate from './routes/investigate.js';
import { ensureCollection } from './lib/qdrant.js';
import { startEmbeddingWorker, stopEmbeddingWorker } from './workers/embedding.js';
import { startIncidentDetector, stopIncidentDetector } from './workers/incident-detector.js';
import { startAlertEvaluator, stopAlertEvaluator } from './workers/alert-evaluator.js';

// ---------------------------------------------------------------------------
// Validate configuration before anything else
// ---------------------------------------------------------------------------
validateConfig();

// ---------------------------------------------------------------------------
// Build the Hono application
// ---------------------------------------------------------------------------

const app = new Hono();

// Global middleware
app.use('*', cors());
app.use('*', logger());

// Mount route groups
app.route('/', health);
app.route('/v1', ingest);
app.route('/v1', investigate);

// Catch-all 404
app.notFound((c) => {
  return c.json(
    { error: 'Not Found', message: `No route matches ${c.req.method} ${c.req.path}` },
    404,
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('[server] Unhandled error:', err);
  return c.json(
    { error: 'Internal Server Error', message: 'An unexpected error occurred.' },
    500,
  );
});

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------

console.log(`[sibyl-ingest] Starting on port ${config.port}`);

serve(
  { fetch: app.fetch, port: config.port },
  (info) => {
    console.log(`[sibyl-ingest] Listening on http://localhost:${info.port}`);

    // Fire-and-forget: ensure Qdrant collection exists
    ensureCollection().catch((err) => {
      console.warn('[sibyl-ingest] Qdrant collection setup deferred:', err);
    });

    // Start background workers (fail gracefully if services unavailable)
    try { startEmbeddingWorker(); } catch (e) { console.warn('[sibyl-ingest] Embedding worker deferred:', e); }
    try { startIncidentDetector(); } catch (e) { console.warn('[sibyl-ingest] Incident detector deferred:', e); }
    try { startAlertEvaluator(); } catch (e) { console.warn('[sibyl-ingest] Alert evaluator deferred:', e); }
  },
);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  console.log(`[sibyl-ingest] Received ${signal}, shutting down gracefully...`);

  // Stop background workers
  stopEmbeddingWorker();
  stopIncidentDetector();
  stopAlertEvaluator();

  // Import dynamically to avoid circular deps at startup
  const { closeClickHouse } = await import('./lib/clickhouse.js');
  await closeClickHouse();

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
