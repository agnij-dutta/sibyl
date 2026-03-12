import { NextResponse } from 'next/server';

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const;
const OPTIONAL_VARS = ['CLICKHOUSE_URL', 'REDIS_URL', 'QDRANT_URL', 'GEMINI_API_KEY'] as const;

export async function GET() {
  const envStatus = Object.fromEntries([
    ...REQUIRED_VARS.map((v) => [v, process.env[v] ? 'set' : 'missing']),
    ...OPTIONAL_VARS.map((v) => [v, process.env[v] ? 'set' : 'unset']),
  ]);

  const allRequired = REQUIRED_VARS.every((v) => process.env[v]);

  return NextResponse.json({
    status: allRequired ? 'ok' : 'degraded',
    service: 'sibyl-web',
    timestamp: new Date().toISOString(),
    env: envStatus,
  });
}
