import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';

// JWT secret — MUST match auth.ts exactly. Uses .env.local via start.sh
const getJWTSecret = () => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }
  if (process.env.NODE_ENV !== 'production') {
    return new TextEncoder().encode('bs-evaluation-jwt-secret-2024-x9k2m-fallback-do-not-use-in-prod');
  }
  throw new Error('[SECURITY] JWT_SECRET environment variable is required in production');
};
const JWT_SECRET = getJWTSecret();

interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}

/**
 * Server-side auth check for protected pages.
 * Must be called from a Server Component.
 * Returns the decoded JWT payload or null if not authenticated.
 */
export async function getServerSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('bs-session')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Require authentication on a server component page.
 * Redirects to /login if not authenticated.
 * Returns the user payload if authenticated.
 */
export async function requireServerAuth(): Promise<JWTPayload> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}
