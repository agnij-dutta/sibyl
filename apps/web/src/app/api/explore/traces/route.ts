import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const service = url.searchParams.get('service');
  const status = url.searchParams.get('status');
  const minDuration = url.searchParams.get('minDuration');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const conditions: string[] = [`org_id = '${auth.orgId}'`];
  if (projectId) conditions.push(`project_id = '${projectId}'`);
  if (service) conditions.push(`service = '${service}'`);
  if (status) conditions.push(`status = '${status}'`);
  if (minDuration) conditions.push(`duration_us >= ${parseInt(minDuration)}`);
  if (from) conditions.push(`start_time >= toDateTime64('${from}', 6)`);
  if (to) conditions.push(`start_time <= toDateTime64('${to}', 6)`);

  // Get root spans (parent_span_id = '') grouped by trace
  const sql = `
    SELECT trace_id, service, operation, status, start_time, duration_us,
           count() as span_count
    FROM spans
    WHERE ${conditions.join(' AND ')} AND parent_span_id = ''
    GROUP BY trace_id, service, operation, status, start_time, duration_us
    ORDER BY start_time DESC
    LIMIT ${limit}
  `;

  try {
    const clickhouseUrl = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
    const response = await fetch(`${clickhouseUrl}/?database=sibyl`, {
      method: 'POST',
      body: `${sql} FORMAT JSON`,
    });

    if (!response.ok) {
      return NextResponse.json({ traces: [], query: sql });
    }

    const data = await response.json();
    return NextResponse.json({ traces: data.data || [] });
  } catch {
    return NextResponse.json({ traces: [], query: sql });
  }
}
