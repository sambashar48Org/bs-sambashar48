import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// JWT secret — prefer environment variable, warn if using fallback
const getJWTSecret = () => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }
  // Fallback for development only — logs warning on first use
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[SECURITY WARNING] Using fallback JWT_SECRET. ' +
      'Set JWT_SECRET environment variable (min 32 chars) for production. ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
    return new TextEncoder().encode('bs-evaluation-jwt-secret-2024-x9k2m-fallback-do-not-use-in-prod');
  }
  throw new Error(
    '[SECURITY] JWT_SECRET environment variable is required in production (min 32 chars). ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
};

const JWT_SECRET = getJWTSecret();

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('bs-session')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await requireAuth();
  if (session.role !== 'admin') throw new Error('Forbidden');
  return session;
}

/**
 * Helper: Create a response that clears the session cookie.
 * Use when user is deleted or session becomes invalid.
 */
export function clearSessionResponse(error: string, status: number = 401) {
  const response = NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('bs-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
