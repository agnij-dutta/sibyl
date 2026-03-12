// ---------------------------------------------------------------------------
// Health Check Route
// ---------------------------------------------------------------------------

import { Hono } from 'hono';

const health = new Hono();

/**
 * GET /healthz
 *
 * Lightweight liveness probe for load balancers and orchestrators.
 * Returns 200 with a JSON body containing the current server timestamp.
 */
health.get('/healthz', (c) => {
  return c.json({
    status: 'ok',
    service: 'sibyl-ingest',
    timestamp: new Date().toISOString(),
  });
});

export default health;
