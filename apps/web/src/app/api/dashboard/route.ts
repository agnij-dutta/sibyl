import { NextResponse } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { getDb, incidents, projects, investigations } from '@sibyl/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Get org projects
  const orgProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, auth.orgId));

  const projectIds = orgProjects.map(p => p.id);

  if (projectIds.length === 0) {
    return NextResponse.json({
      projects: [],
      recentIncidents: [],
      recentInvestigations: [],
      stats: { totalEvents: 0, totalIncidents: 0, totalInvestigations: 0, services: 0 },
    });
  }

  // Get recent incidents
  const recentIncidents = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.lastSeen))
    .limit(10);

  const filteredIncidents = recentIncidents.filter(i => projectIds.includes(i.projectId));

  // Get recent investigations
  const recentInvestigations = await db
    .select()
    .from(investigations)
    .orderBy(desc(investigations.createdAt))
    .limit(5);

  const filteredInvestigations = recentInvestigations.filter(i => projectIds.includes(i.projectId));

  // Basic stats
  const allIncidents = await db
    .select()
    .from(incidents);

  const allInvestigations = await db
    .select()
    .from(investigations);

  return NextResponse.json({
    projects: orgProjects,
    recentIncidents: filteredIncidents,
    recentInvestigations: filteredInvestigations,
    stats: {
      totalProjects: orgProjects.length,
      totalIncidents: allIncidents.filter(i => projectIds.includes(i.projectId)).length,
      totalInvestigations: allInvestigations.filter(i => projectIds.includes(i.projectId)).length,
      openIncidents: filteredIncidents.filter(i => i.status === 'open').length,
    },
  });
}
