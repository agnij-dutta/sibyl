import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Create a Drizzle ORM instance backed by a Neon serverless Postgres connection.
 *
 * @param databaseUrl - Optional connection string. Falls back to DATABASE_URL env var.
 * @returns A fully-typed Drizzle database client with the Sibyl schema.
 */
export function getDb(databaseUrl?: string) {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. Pass it explicitly or set the DATABASE_URL environment variable.',
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

/** Fully-typed Drizzle database client. */
export type Database = ReturnType<typeof getDb>;

// Re-export everything so consumers only need `@sibyl/db`
export * from './schema';
export * from './clickhouse';
export { createId } from './utils';
