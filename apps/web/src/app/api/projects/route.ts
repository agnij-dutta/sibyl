import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, projects, apiKeys, createId } from '@sibyl/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, auth.orgId));

  return NextResponse.json({ projects: result });
}

export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, platform } = body;

  if (!name) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const db = getDb();

  const projectId = createId();
  const keyId = createId();
  const rawKey = `sb_${createId()}${createId()}`;
  const keyPrefix = rawKey.slice(0, 10);

  // Create project with DSN
  const dsn = `https://${rawKey}@ingest.sibyl.dev/${projectId}`;

  await db.insert(projects).values({
    id: projectId,
    orgId: auth.orgId,
    name,
    dsn,
    platform: platform || 'node',
  });

  // Create default API key
  const { createHash } = await import('crypto');
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  await db.insert(apiKeys).values({
    id: keyId,
    projectId,
    keyHash,
    keyPrefix,
    label: 'Default',
    scopes: ['ingest'],
  });

  return NextResponse.json({
    project: { id: projectId, name, dsn, platform: platform || 'node' },
    apiKey: { prefix: keyPrefix, key: rawKey },
  }, { status: 201 });
}
