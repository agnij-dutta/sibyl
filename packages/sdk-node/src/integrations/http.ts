/**
 * Lightweight auto-instrumentation for Node.js http/https outgoing requests.
 *
 * Monkey-patches `http.request` and `https.request` to record outgoing HTTP
 * calls as breadcrumbs on the active Sibyl client.
 */

import http from 'node:http';
import https from 'node:https';
import { Sibyl } from '../index.js';
import type { Breadcrumb } from '../types.js';

// ---------------------------------------------------------------------------
// Original references (stored on first enable, restored on disable)
// ---------------------------------------------------------------------------

let originalHttpRequest: typeof http.request | null = null;
let originalHttpsRequest: typeof https.request | null = null;
let isEnabled = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive method, host, port, and path from the various overloaded forms of
 * `http.request(url, options?, callback?)`.
 */
function extractRequestMeta(
  args: unknown[]
): { method: string; url: string } {
  let method = 'GET';
  let url = '';

  const first = args[0];

  if (typeof first === 'string') {
    url = first;
    // Options may override method
    const opts = typeof args[1] === 'object' && args[1] !== null ? args[1] as Record<string, unknown> : null;
    if (opts?.method) method = String(opts.method);
  } else if (first instanceof URL) {
    url = first.toString();
    const opts = typeof args[1] === 'object' && args[1] !== null ? args[1] as Record<string, unknown> : null;
    if (opts?.method) method = String(opts.method);
  } else if (typeof first === 'object' && first !== null) {
    const opts = first as Record<string, unknown>;
    method = String(opts.method || 'GET');
    const proto = opts.protocol || 'http:';
    const host = opts.hostname || opts.host || 'localhost';
    const port = opts.port ? `:${opts.port}` : '';
    const path = opts.path || '/';
    url = `${proto}//${host}${port}${path}`;
  }

  return { method: method.toUpperCase(), url };
}

/**
 * Build a breadcrumb for an outgoing HTTP request.
 */
function makeBreadcrumb(
  method: string,
  url: string,
  statusCode: number | undefined,
  durationMs: number,
  error?: string,
): Breadcrumb {
  const data: Record<string, unknown> = {
    method,
    url,
    duration_ms: durationMs,
  };
  if (statusCode !== undefined) data.status_code = statusCode;
  if (error) data.error = error;

  return {
    type: 'http',
    category: 'http.client',
    message: `${method} ${url}${statusCode !== undefined ? ` [${statusCode}]` : ''}`,
    data,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Patching logic
// ---------------------------------------------------------------------------

type RequestFn = typeof http.request;

function wrapRequest(original: RequestFn): RequestFn {
  // We return a function that preserves the overloaded signatures of
  // http.request. TypeScript cannot fully model monkey-patching so we cast.
  const wrapped = function sibylWrappedRequest(
    this: unknown,
    ...args: unknown[]
  ): http.ClientRequest {
    const startMs = Date.now();
    const { method, url } = extractRequestMeta(args);

    // Call original — TypeScript signature varies, so we use apply.
    const req: http.ClientRequest = (original as Function).apply(this, args) as http.ClientRequest;

    req.on('response', (res: http.IncomingMessage) => {
      const durationMs = Date.now() - startMs;
      const breadcrumb = makeBreadcrumb(method, url, res.statusCode, durationMs);
      try { Sibyl.getClient()?.addBreadcrumb(breadcrumb); } catch { /* noop */ }
    });

    req.on('error', (err: Error) => {
      const durationMs = Date.now() - startMs;
      const breadcrumb = makeBreadcrumb(method, url, undefined, durationMs, err.message);
      try { Sibyl.getClient()?.addBreadcrumb(breadcrumb); } catch { /* noop */ }
    });

    return req;
  };

  return wrapped as unknown as RequestFn;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enable automatic HTTP instrumentation.
 *
 * Patches `http.request` and `https.request` to capture outgoing requests as
 * breadcrumbs on the Sibyl client. Safe to call multiple times; subsequent
 * calls are no-ops if already enabled.
 */
export function enableHttpInstrumentation(): void {
  if (isEnabled) return;

  originalHttpRequest = http.request;
  originalHttpsRequest = https.request;

  http.request = wrapRequest(originalHttpRequest);
  https.request = wrapRequest(originalHttpsRequest as unknown as RequestFn) as unknown as typeof https.request;

  isEnabled = true;
}

/**
 * Disable automatic HTTP instrumentation and restore the original functions.
 */
export function disableHttpInstrumentation(): void {
  if (!isEnabled) return;

  if (originalHttpRequest) {
    http.request = originalHttpRequest;
    originalHttpRequest = null;
  }
  if (originalHttpsRequest) {
    https.request = originalHttpsRequest;
    originalHttpsRequest = null;
  }

  isEnabled = false;
}
