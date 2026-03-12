import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb, users, organizations, createId } from '@sibyl/db';
import { createToken, TOKEN_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, orgName } = body;

    if (!email || !password || !name || !orgName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, orgName' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create organization
    const orgId = createId();
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    await db.insert(organizations).values({
      id: orgId,
      name: orgName,
      slug: `${slug}-${orgId.slice(0, 6)}`,
      plan: 'free',
    });

    // Create user
    const userId = createId();
    const passwordHash = await hash(password, 12);

    await db.insert(users).values({
      id: userId,
      orgId,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'owner',
    });

    // Generate JWT
    const token = await createToken({
      userId,
      orgId,
      email: email.toLowerCase(),
      role: 'owner',
    });

    const response = NextResponse.json({
      user: { id: userId, email: email.toLowerCase(), name, role: 'owner' },
      organization: { id: orgId, name: orgName, slug },
    }, { status: 201 });

    response.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
