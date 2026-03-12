import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sibyl-dev-secret-change-in-production'
);

const TOKEN_NAME = 'sibyl-token';
const TOKEN_EXPIRY = '7d';

export interface AuthPayload extends JWTPayload {
  userId: string;
  orgId: string;
  email: string;
  role: string;
}

export async function createToken(payload: Omit<AuthPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

export async function getAuthFromRequest(request: Request): Promise<AuthPayload | null> {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  const headerToken = getTokenFromHeader(authHeader);
  if (headerToken) return verifyToken(headerToken);

  // Try cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${TOKEN_NAME}=([^;]+)`));
    if (match) return verifyToken(match[1]);
  }

  return null;
}

export { TOKEN_NAME };
