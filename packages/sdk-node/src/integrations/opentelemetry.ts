/**
 * OpenTelemetry-compatible SpanExporter that sends spans to the Sibyl ingest endpoint.
 *
 * This module defines OTel span types inline so that @opentelemetry/* packages
 * are NOT required as dependencies. The exporter can be plugged into any
 * standard OTel TracerProvider via `addSpanProcessor(new SimpleSpanProcessor(exporter))`.
 */

import { Sibyl } from '../index.js';
import type { SibylClient } from '../client.js';
import type { SibylSpan } from '../types.js';

// ---------------------------------------------------------------------------
// Inline OTel types (no external dependency)
// ---------------------------------------------------------------------------

export interface OTelAttributeValue {
  stringValue?: string;
  intValue?: number;
  boolValue?: boolean;
  doubleValue?: number;
  arrayValue?: { values: OTelAttributeValue[] };
}

export interface OTelAttribute {
  key: string;
  value: OTelAttributeValue;
}

export interface OTelSpanEvent {
  name: string;
  timeUnixNano: string | number;
  attributes?: OTelAttribute[];
}

export interface OTelSpanStatus {
  code: number;
  message?: string;
}

export interface OTelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string | number;
  endTimeUnixNano: string | number;
  attributes?: OTelAttribute[];
  status?: OTelSpanStatus;
  events?: OTelSpanEvent[];
}

/**
 * ExportResult mirrors the OTel SDK enum:
 *   SUCCESS = 0, FAILED = 1
 */
export interface ExportResult {
  code: number;
  error?: Error;
}

export interface ExportResultCallback {
  (result: ExportResult): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map OTel SpanKind int to Sibyl kind string. */
function mapSpanKind(kind: number): SibylSpan['kind'] {
  switch (kind) {
    case 0: return 'internal';  // INTERNAL
    case 1: return 'server';    // SERVER
    case 2: return 'client';    // CLIENT
    case 3: return 'producer';  // PRODUCER
    case 4: return 'consumer';  // CONSUMER
    default: return 'internal';
  }
}

/** Map OTel status code int to Sibyl status string. */
function mapStatus(code: number | undefined): SibylSpan['status'] {
  switch (code) {
    case 0: return 'unset'; // UNSET
    case 1: return 'ok';    // OK
    case 2: return 'error'; // ERROR
    default: return 'unset';
  }
}

/** Flatten OTel attributes into a plain record. */
function flattenAttributes(attrs?: OTelAttribute[]): Record<string, unknown> | undefined {
  if (!attrs || attrs.length === 0) return undefined;
  const result: Record<string, unknown> = {};
  for (const attr of attrs) {
    const v = attr.value;
    if (v.stringValue !== undefined) result[attr.key] = v.stringValue;
    else if (v.intValue !== undefined) result[attr.key] = v.intValue;
    else if (v.boolValue !== undefined) result[attr.key] = v.boolValue;
    else if (v.doubleValue !== undefined) result[attr.key] = v.doubleValue;
  }
  return result;
}

/** Convert nanosecond timestamp (string | number) to ISO 8601 string. */
function nanoToISO(ns: string | number): string {
  const nanos = typeof ns === 'string' ? BigInt(ns) : BigInt(ns);
  const millis = Number(nanos / BigInt(1_000_000));
  return new Date(millis).toISOString();
}

/** Compute duration in microseconds from start/end nanosecond timestamps. */
function durationMicros(startNs: string | number, endNs: string | number): number {
  const start = typeof startNs === 'string' ? BigInt(startNs) : BigInt(startNs);
  const end = typeof endNs === 'string' ? BigInt(endNs) : BigInt(endNs);
  return Number((end - start) / BigInt(1_000));
}

/** Convert an OTel span to a Sibyl span. */
function toSibylSpan(otel: OTelSpan, service: string): SibylSpan {
  const sibylEvents = otel.events?.map((e) => ({
    name: e.name,
    timestamp: nanoToISO(e.timeUnixNano),
    attributes: flattenAttributes(e.attributes),
  }));

  return {
    trace_id: otel.traceId,
    span_id: otel.spanId,
    parent_span_id: otel.parentSpanId || '',
    service,
    operation: otel.name,
    kind: mapSpanKind(otel.kind),
    status: mapStatus(otel.status?.code),
    start_time: nanoToISO(otel.startTimeUnixNano),
    duration_us: durationMicros(otel.startTimeUnixNano, otel.endTimeUnixNano),
    attributes: flattenAttributes(otel.attributes),
    events: sibylEvents,
  };
}

// ---------------------------------------------------------------------------
// SibylSpanExporter
// ---------------------------------------------------------------------------

export class SibylSpanExporter {
  private client: SibylClient | null = null;
  private serviceName: string;
  private isShutdown = false;

  /**
   * @param serviceName - Logical service name attached to every exported span.
   *                      Defaults to 'unknown'.
   */
  constructor(serviceName?: string) {
    this.serviceName = serviceName || 'unknown';
  }

  private getClient(): SibylClient {
    if (!this.client) {
      const c = Sibyl.getClient();
      if (!c) throw new Error('Sibyl.init() must be called before using SibylSpanExporter');
      this.client = c;
    }
    return this.client;
  }

  /**
   * Export a batch of OTel spans.
   *
   * Accepts either:
   *  - (spans, callback)  -- the OTel SDK callback style
   *  - (spans)            -- returns a Promise
   */
  export(spans: OTelSpan[], resultCallback?: ExportResultCallback): void | Promise<void> {
    if (this.isShutdown) {
      const result: ExportResult = { code: 1, error: new Error('Exporter is shut down') };
      if (resultCallback) { resultCallback(result); return; }
      return Promise.resolve();
    }

    try {
      const client = this.getClient();
      for (const otelSpan of spans) {
        client.addSpan(toSibylSpan(otelSpan, this.serviceName));
      }

      const result: ExportResult = { code: 0 };
      if (resultCallback) { resultCallback(result); return; }
      return Promise.resolve();
    } catch (err) {
      const result: ExportResult = { code: 1, error: err instanceof Error ? err : new Error(String(err)) };
      if (resultCallback) { resultCallback(result); return; }
      return Promise.resolve();
    }
  }

  /**
   * Flush any pending spans by delegating to the Sibyl client's flush.
   */
  async forceFlush(): Promise<void> {
    if (this.isShutdown) return;
    try {
      const client = this.getClient();
      await client.flush();
    } catch {
      // Client may not be initialised yet; safe to ignore.
    }
  }

  /**
   * Shutdown the exporter. Flushes remaining data and prevents future exports.
   */
  async shutdown(): Promise<void> {
    if (this.isShutdown) return;
    this.isShutdown = true;
    await this.forceFlush();
  }
}
