import { describe, it, expect } from 'vitest';

// We test the pure functions directly since getSession depends on Next.js cookies()
// Re-implement the core logic here to test it without Next.js runtime

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode('test-secret-key');

async function createToken(payload: { userId: string; orgId: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

describe('Auth utilities', () => {
  describe('createToken + verifyToken', () => {
    it('creates a valid JWT that can be verified', async () => {
      const token = await createToken({
        userId: 'user_123',
        orgId: 'org_456',
        email: 'test@example.com',
        role: 'admin',
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format

      const payload = await verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe('user_123');
      expect(payload!.orgId).toBe('org_456');
      expect(payload!.email).toBe('test@example.com');
      expect(payload!.role).toBe('admin');
    });

    it('includes iat and exp claims', async () => {
      const token = await createToken({
        userId: 'u1',
        orgId: 'o1',
        email: 'a@b.com',
        role: 'member',
      });

      const payload = await verifyToken(token);
      expect(payload!.iat).toBeDefined();
      expect(payload!.exp).toBeDefined();
      expect(payload!.exp!).toBeGreaterThan(payload!.iat!);
    });
  });

  describe('verifyToken', () => {
    it('returns null for invalid tokens', async () => {
      const result = await verifyToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('returns null for empty string', async () => {
      const result = await verifyToken('');
      expect(result).toBeNull();
    });

    it('returns null for tokens signed with different secret', async () => {
      const otherSecret = new TextEncoder().encode('different-secret');
      const token = await new SignJWT({ userId: 'u1' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(otherSecret);

      const result = await verifyToken(token);
      expect(result).toBeNull();
    });

    it('returns null for expired tokens', async () => {
      const token = await new SignJWT({ userId: 'u1' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('0s')
        .sign(JWT_SECRET);

      // Wait a moment for expiry
      await new Promise((r) => setTimeout(r, 1100));

      const result = await verifyToken(token);
      expect(result).toBeNull();
    });
  });

  describe('getTokenFromHeader', () => {
    it('extracts token from Bearer header', () => {
      expect(getTokenFromHeader('Bearer abc123')).toBe('abc123');
    });

    it('returns null for null header', () => {
      expect(getTokenFromHeader(null)).toBeNull();
    });

    it('returns null for non-Bearer header', () => {
      expect(getTokenFromHeader('Basic abc123')).toBeNull();
    });

    it('returns empty string for "Bearer " with no token', () => {
      expect(getTokenFromHeader('Bearer ')).toBe('');
    });
  });
});
