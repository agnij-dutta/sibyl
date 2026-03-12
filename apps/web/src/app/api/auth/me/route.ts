import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, users, organizations } from '@sibyl/db';
import { getAuthFromRequest, TOKEN_NAME } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = await getAuthFromRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDb();

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        orgId: users.orgId,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result[0];

    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
      })
      .from(organizations)
      .where(eq(organizations.id, user.orgId))
      .limit(1);

    return NextResponse.json({
      user,
      organization: orgs[0] || null,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TOKEN_NAME);
  return response;
}
