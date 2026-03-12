import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

// This route queries ClickHouse for log events
// In production, we'd use the ClickHouse client directly
export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const level = url.searchParams.get('level');
  const service = url.searchParams.get('service');
  const query = url.searchParams.get('q');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = parseInt(url.searchParams.get('limit') || '100');

  // Build ClickHouse query
  const conditions: string[] = [`org_id = '${auth.orgId}'`];
  if (projectId) conditions.push(`project_id = '${projectId}'`);
  if (level) conditions.push(`level = '${level}'`);
  if (service) conditions.push(`service = '${service}'`);
  if (query) conditions.push(`message ILIKE '%${query.replace(/'/g, "''")}%'`);
  if (from) conditions.push(`timestamp >= toDateTime64('${from}', 3)`);
  if (to) conditions.push(`timestamp <= toDateTime64('${to}', 3)`);

  const sql = `
    SELECT event_id, timestamp, level, service, environment, message, fingerprint, trace_id, span_id, user_id, metadata
    FROM events
    WHERE ${conditions.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  // For now, return the query (ClickHouse integration in Phase 2)
  try {
    const clickhouseUrl = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
    const response = await fetch(`${clickhouseUrl}/?database=sibyl`, {
      method: 'POST',
      body: `${sql} FORMAT JSON`,
    });

    if (!response.ok) {
      // ClickHouse not available, return empty
      return NextResponse.json({ events: [], query: sql });
    }

    const data = await response.json();
    return NextResponse.json({ events: data.data || [], meta: data.statistics });
  } catch {
    return NextResponse.json({ events: [], query: sql });
  }
}
