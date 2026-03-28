import { NextResponse } from 'next/server';
import { eq, and, count, sql } from 'drizzle-orm';
import { getDb, investigationFeedback, investigations } from '@sibyl/db';
import { getAuthFromRequest } from '@/lib/auth';

// POST /api/investigations/feedback — Submit feedback on an investigation
export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { investigationId, rating, rootCauseAccurate, comment } = body;

  if (!investigationId || !rating) {
    return NextResponse.json(
      { error: 'investigationId and rating are required' },
      { status: 400 },
    );
  }

  if (!['helpful', 'not_helpful'].includes(rating)) {
    return NextResponse.json(
      { error: 'rating must be "helpful" or "not_helpful"' },
      { status: 400 },
    );
  }

  const db = getDb();

  // Verify investigation exists
  const inv = await db
    .select({ id: investigations.id })
    .from(investigations)
    .where(eq(investigations.id, investigationId))
    .limit(1);

  if (inv.length === 0) {
    return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  }

  const [feedback] = await db
    .insert(investigationFeedback)
    .values({
      investigationId,
      userId: auth.userId,
      rating,
      rootCauseAccurate: rootCauseAccurate ?? null,
      comment: comment || null,
    })
    .returning();

  return NextResponse.json({ feedback }, { status: 201 });
}

// GET /api/investigations/feedback?investigationId=xxx — Get feedback for an investigation
export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const investigationId = url.searchParams.get('investigationId');

  const db = getDb();

  if (investigationId) {
    const feedback = await db
      .select()
      .from(investigationFeedback)
      .where(eq(investigationFeedback.investigationId, investigationId));

    return NextResponse.json({ feedback });
  }

  // Aggregate accuracy stats
  const stats = await db
    .select({
      total: count(),
      helpful: count(
        sql`CASE WHEN ${investigationFeedback.rating} = 'helpful' THEN 1 END`,
      ),
      accurate: count(
        sql`CASE WHEN ${investigationFeedback.rootCauseAccurate} = true THEN 1 END`,
      ),
    })
    .from(investigationFeedback);

  const total = Number(stats[0]?.total || 0);
  const helpful = Number(stats[0]?.helpful || 0);
  const accurate = Number(stats[0]?.accurate || 0);

  return NextResponse.json({
    stats: {
      totalFeedback: total,
      helpfulRate: total > 0 ? Math.round((helpful / total) * 100) : null,
      accuracyRate: total > 0 ? Math.round((accurate / total) * 100) : null,
    },
  });
}
