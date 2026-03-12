-- ===========================================================================
-- Sibyl ClickHouse Schema - Telemetry Storage
-- ===========================================================================
-- This file is mounted into the ClickHouse container at
-- /docker-entrypoint-initdb.d/init.sql and runs automatically on first start.
--
-- Tables use MergeTree with time-based partitioning and a 30-day TTL for
-- events. Spans have no TTL by default (configure as needed).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Events table: error/log events ingested by SDKs
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Spans table: distributed tracing spans
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Materialized views for common query patterns
-- ---------------------------------------------------------------------------

-- Hourly error counts per project+fingerprint for dashboard charts
CREATE TABLE IF NOT EXISTS events_hourly_mv (
    project_id  String,
    fingerprint String,
    hour        DateTime,
    level       LowCardinality(String),
    service     LowCardinality(String),
    environment LowCardinality(String),
    count       UInt64
) ENGINE = SummingMergeTree()
ORDER BY (project_id, fingerprint, hour, level, service, environment);

CREATE MATERIALIZED VIEW IF NOT EXISTS events_hourly_view
TO events_hourly_mv AS
SELECT
    project_id,
    fingerprint,
    toStartOfHour(timestamp) AS hour,
    level,
    service,
    environment,
    count() AS count
FROM events
GROUP BY project_id, fingerprint, hour, level, service, environment;

-- Service-level span latency percentiles (p50/p95/p99) per hour
CREATE TABLE IF NOT EXISTS spans_latency_mv (
    project_id  String,
    service     LowCardinality(String),
    operation   String,
    hour        DateTime,
    count       UInt64,
    sum_us      UInt64,
    max_us      UInt64
) ENGINE = SummingMergeTree()
ORDER BY (project_id, service, operation, hour);

CREATE MATERIALIZED VIEW IF NOT EXISTS spans_latency_view
TO spans_latency_mv AS
SELECT
    project_id,
    service,
    operation,
    toStartOfHour(start_time) AS hour,
    count()        AS count,
    sum(duration_us) AS sum_us,
    max(duration_us) AS max_us
FROM spans
GROUP BY project_id, service, operation, hour;
