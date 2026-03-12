import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, alertRules, projects, createId } from '@sibyl/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  const db = getDb();

  if (projectId) {
    // Verify project belongs to org
    const proj = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.orgId, auth.orgId))
    ).limit(1);

    if (proj.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const result = await db.select().from(alertRules).where(eq(alertRules.projectId, projectId));
    return NextResponse.json({ alerts: result });
  }

  // Get all alerts for org's projects
  const orgProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.orgId, auth.orgId));
  const projectIds = orgProjects.map(p => p.id);

  if (projectIds.length === 0) return NextResponse.json({ alerts: [] });

  const allAlerts = [];
  for (const pid of projectIds) {
    const result = await db.select().from(alertRules).where(eq(alertRules.projectId, pid));
    allAlerts.push(...result);
  }

  return NextResponse.json({ alerts: allAlerts });
}

export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { projectId, name, type, condition, channels } = body;

  if (!projectId || !name || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = getDb();

  // Verify project
  const proj = await db.select().from(projects).where(
    and(eq(projects.id, projectId), eq(projects.orgId, auth.orgId))
  ).limit(1);

  if (proj.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const id = createId();
  await db.insert(alertRules).values({
    id,
    projectId,
    name,
    type,
    condition: condition || {},
    channels: channels || [],
    enabled: true,
  });

  return NextResponse.json({ alert: { id, projectId, name, type, condition: condition || {}, channels: channels || [], enabled: true } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, enabled } = body;

  if (!id || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Missing required fields: id, enabled' }, { status: 400 });
  }

  const db = getDb();

  // Get the alert and verify it belongs to the user's org
  const alert = await db.select().from(alertRules).where(eq(alertRules.id, id)).limit(1);
  if (alert.length === 0) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  const proj = await db.select().from(projects).where(
    and(eq(projects.id, alert[0].projectId), eq(projects.orgId, auth.orgId))
  ).limit(1);

  if (proj.length === 0) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  await db.update(alertRules).set({ enabled }).where(eq(alertRules.id, id));

  return NextResponse.json({ alert: { ...alert[0], enabled } });
}

export async function DELETE(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing alert id' }, { status: 400 });
  }

  const db = getDb();

  // Get the alert and verify it belongs to the user's org
  const alert = await db.select().from(alertRules).where(eq(alertRules.id, id)).limit(1);
  if (alert.length === 0) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  const proj = await db.select().from(projects).where(
    and(eq(projects.id, alert[0].projectId), eq(projects.orgId, auth.orgId))
  ).limit(1);

  if (proj.length === 0) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  await db.delete(alertRules).where(eq(alertRules.id, id));

  return NextResponse.json({ success: true });
}
