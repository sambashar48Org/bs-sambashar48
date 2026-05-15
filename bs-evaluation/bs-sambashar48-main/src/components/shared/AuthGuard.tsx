import { requireServerAuth } from '@/lib/server-auth';

/**
 * Server Component wrapper that protects authenticated pages.
 * Runs server-side BEFORE any client component renders.
 * Redirects to /login if no valid session cookie exists.
 */
export default async function AuthGuard({ children }: { children: React.ReactNode }) {
  await requireServerAuth();
  return <>{children}</>;
}
