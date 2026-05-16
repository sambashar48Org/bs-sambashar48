import { requireServerAuth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';

/**
 * Server Component wrapper for admin-only pages.
 * Verifies the user has admin role, redirects appropriately otherwise.
 */
export default async function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = await requireServerAuth();
  if (session.role !== 'admin') {
    redirect('/');
  }
  return <>{children}</>;
}
