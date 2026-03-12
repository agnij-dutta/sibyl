import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

// Hybrid search: keyword (ClickHouse) + semantic (Qdrant) + rank fusion
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { query, projectId, limit = 50 } = body;

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  // Phase 3 will implement full hybrid search
  // For now, do keyword search against ClickHouse
  const conditions = [`org_id = '${auth.orgId}'`];
  if (projectId) conditions.push(`project_id = '${projectId}'`);
  conditions.push(`message ILIKE '%${query.replace(/'/g, "''")}%'`);

  const sql = `
    SELECT event_id, timestamp, level, service, message, fingerprint, trace_id
    FROM events
    WHERE ${conditions.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  try {
    const clickhouseUrl = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
    const response = await fetch(`${clickhouseUrl}/?database=sibyl`, {
      method: 'POST',
      body: `${sql} FORMAT JSON`,
    });

    if (!response.ok) {
      return NextResponse.json({ results: [], query: sql });
    }

    const data = await response.json();
    return NextResponse.json({
      results: (data.data || []).map((row: any, i: number) => ({
        ...row,
        score: 1 - i * 0.01, // Simple rank score
        source: 'keyword',
      })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
