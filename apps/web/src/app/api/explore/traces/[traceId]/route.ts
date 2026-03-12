import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { traceId } = await params;

  const sql = `
    SELECT trace_id, span_id, parent_span_id, service, operation, kind, status,
           start_time, duration_us, attributes, events
    FROM spans
    WHERE org_id = '${auth.orgId}' AND trace_id = '${traceId}'
    ORDER BY start_time ASC
  `;

  try {
    const clickhouseUrl = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
    const response = await fetch(`${clickhouseUrl}/?database=sibyl`, {
      method: 'POST',
      body: `${sql} FORMAT JSON`,
    });

    if (!response.ok) {
      return NextResponse.json({ spans: [], query: sql });
    }

    const data = await response.json();
    return NextResponse.json({ spans: data.data || [] });
  } catch {
    return NextResponse.json({ spans: [], query: sql });
  }
}
