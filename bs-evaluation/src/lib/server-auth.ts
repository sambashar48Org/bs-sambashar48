import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { getJWTSecretBytes } from './jwt-secret';

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

    const { payload } = await jwtVerify(token, getJWTSecretBytes());
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
