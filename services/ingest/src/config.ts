// ---------------------------------------------------------------------------
// Sibyl Ingest Service - Configuration
// ---------------------------------------------------------------------------
// All configuration is sourced from environment variables with sensible
// defaults for local development. In production every secret MUST be set
// explicitly -- the service will log warnings on startup for missing values.
// ---------------------------------------------------------------------------

export const config = {
  /** HTTP port the Hono server listens on. */
  port: parseInt(process.env.PORT || '3001', 10),

  /** ClickHouse connection details for high-volume telemetry storage. */
  clickhouse: {
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    database: process.env.CLICKHOUSE_DATABASE || 'sibyl',
    username: process.env.CLICKHOUSE_USERNAME || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
  },

  /** Redis connection for caching, pub/sub, and rate-limiting state. */
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  /** Qdrant vector database for semantic search over events. */
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || '',
    collection: 'sibyl_events',
  },

  /** Google Gemini configuration for AI reasoning and embeddings. */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.0-flash',
    embeddingModel: 'text-embedding-004',
  },

  /** PostgreSQL (Neon) connection string used via @sibyl/db. */
  database: {
    url: process.env.DATABASE_URL || '',
  },
} as const;

// ---------------------------------------------------------------------------
// Startup validation helpers
// ---------------------------------------------------------------------------

const REQUIRED_SECRETS: Array<{ key: string; value: string }> = [
  { key: 'DATABASE_URL', value: config.database.url },
];

const RECOMMENDED_SECRETS: Array<{ key: string; value: string }> = [
  { key: 'GEMINI_API_KEY', value: config.gemini.apiKey },
];

export function validateConfig(): void {
  for (const { key, value } of REQUIRED_SECRETS) {
    if (!value) {
      console.error(`[config] FATAL: Required environment variable ${key} is not set.`);
      process.exit(1);
    }
  }

  for (const { key, value } of RECOMMENDED_SECRETS) {
    if (!value) {
      console.warn(`[config] WARNING: ${key} is not set. Some features will be unavailable.`);
    }
  }
}
