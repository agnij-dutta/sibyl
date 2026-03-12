// ---------------------------------------------------------------------------
// ClickHouse type definitions and DDL for high-volume telemetry storage
// ---------------------------------------------------------------------------

/**
 * Represents a single error/log event ingested by the SDK.
 */
export interface ClickHouseEvent {
  event_id: string;
  org_id: string;
  project_id: string;
  timestamp: string; // ISO-8601 or DateTime64(3) compatible string
  level: string;
  service: string;
  environment: string;
  message: string;
  fingerprint: string;
  trace_id: string;
  span_id: string;
  user_id: string;
  metadata: string; // JSON-encoded string
  sdk_name: string;
  sdk_version: string;
}

/**
 * Represents a single distributed-tracing span.
 */
export interface ClickHouseSpan {
  trace_id: string;
  span_id: string;
  parent_span_id: string;
  org_id: string;
  project_id: string;
  service: string;
  operation: string;
  kind: string;
  status: string;
  start_time: string; // ISO-8601 or DateTime64(6) compatible string
  duration_us: number; // microseconds
  attributes: string; // JSON-encoded string
  events: string; // JSON-encoded string
}

/**
 * Generic wrapper for ClickHouse query results returned by the HTTP interface.
 */
export interface ClickHouseQueryResult<T = Record<string, unknown>> {
  data: T[];
  rows: number;
  meta: Array<{ name: string; type: string }>;
  statistics: {
    elapsed: number;
    rows_read: number;
    bytes_read: number;
  };
}

// ---------------------------------------------------------------------------
// DDL Statements
// ---------------------------------------------------------------------------

export const CREATE_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS events (
    event_id     String,
    org_id       String,
    project_id   String,
    timestamp    DateTime64(3),
    level        LowCardinality(String),
    service      LowCardinality(String),
    environment  LowCardinality(String),
    message      String,
    fingerprint  String,
    trace_id     String,
    span_id      String,
    user_id      String,
    metadata     String,
    sdk_name     LowCardinality(String),
    sdk_version  String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (org_id, project_id, timestamp, fingerprint)
TTL timestamp + INTERVAL 30 DAY;
`.trim();

export const CREATE_SPANS_TABLE = `
CREATE TABLE IF NOT EXISTS spans (
    trace_id       String,
    span_id        String,
    parent_span_id String,
    org_id         String,
    project_id     String,
    service        LowCardinality(String),
    operation      String,
    kind           LowCardinality(String),
    status         LowCardinality(String),
    start_time     DateTime64(6),
    duration_us    UInt64,
    attributes     String,
    events         String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_time)
ORDER BY (org_id, project_id, trace_id, start_time);
`.trim();
