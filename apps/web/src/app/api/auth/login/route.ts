import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb, users, organizations } from '@sibyl/db';
import { createToken, TOKEN_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find user
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result[0];

    // Verify password
    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get organization
    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.orgId))
      .limit(1);

    const org = orgs[0];

    // Generate JWT
    const token = await createToken({
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: org ? {
        id: org.id,
        name: org.name,
        slug: org.slug,
      } : null,
    });

    response.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
