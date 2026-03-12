import { NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { getDb, incidents, projects } from '@sibyl/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const db = getDb();

  // Get org's project IDs
  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, auth.orgId));

  const projectIds = orgProjects.map(p => p.id);
  if (projectIds.length === 0) {
    return NextResponse.json({ incidents: [] });
  }

  const conditions = [];
  if (projectId && projectIds.includes(projectId)) {
    conditions.push(eq(incidents.projectId, projectId));
  }
  if (status && ['open', 'resolved', 'ignored'].includes(status)) {
    conditions.push(eq(incidents.status, status as 'open' | 'resolved' | 'ignored'));
  }

  const result = await db
    .select()
    .from(incidents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(incidents.lastSeen))
    .limit(limit);

  // Filter to only org's projects
  const filtered = result.filter(i => projectIds.includes(i.projectId));

  return NextResponse.json({ incidents: filtered });
}
