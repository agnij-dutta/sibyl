import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, incidents, projects } from '@sibyl/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  // Verify org ownership
  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, auth.orgId));

  const projectIds = orgProjects.map(p => p.id);

  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, id))
    .limit(1);

  if (!incident || !projectIds.includes(incident.projectId)) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  return NextResponse.json({ incident });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !['open', 'resolved', 'ignored'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = getDb();

  // Verify org ownership
  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, auth.orgId));

  const projectIds = orgProjects.map(p => p.id);

  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, id))
    .limit(1);

  if (!incident || !projectIds.includes(incident.projectId)) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  const [updated] = await db
    .update(incidents)
    .set({ status: status as 'open' | 'resolved' | 'ignored' })
    .where(eq(incidents.id, id))
    .returning();

  return NextResponse.json({ incident: updated });
}
