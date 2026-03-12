import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Auto-discover services from spans in ClickHouse
  const sql = `
    SELECT
      service,
      count() as span_count,
      countIf(status = 'error') as error_count,
      avg(duration_us) as avg_duration_us,
      max(start_time) as last_seen
    FROM spans
    WHERE org_id = '${auth.orgId}'
      AND start_time >= now() - INTERVAL 24 HOUR
    GROUP BY service
    ORDER BY span_count DESC
  `;

  try {
    const clickhouseUrl = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
    const response = await fetch(`${clickhouseUrl}/?database=sibyl`, {
      method: 'POST',
      body: `${sql} FORMAT JSON`,
    });

    if (!response.ok) {
      return NextResponse.json({ services: [] });
    }

    const data = await response.json();
    return NextResponse.json({
      services: (data.data || []).map((row: any) => ({
        name: row.service,
        spanCount: parseInt(row.span_count),
        errorCount: parseInt(row.error_count),
        avgDurationMs: Math.round(parseInt(row.avg_duration_us) / 1000),
        errorRate: parseInt(row.span_count) > 0
          ? (parseInt(row.error_count) / parseInt(row.span_count) * 100).toFixed(2)
          : '0',
        lastSeen: row.last_seen,
      })),
    });
  } catch {
    return NextResponse.json({ services: [] });
  }
}
