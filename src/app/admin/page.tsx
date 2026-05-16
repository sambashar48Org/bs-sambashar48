import AdminGuard from '@/components/shared/AdminGuard';
import AdminContent from '@/components/AdminContent';

/**
 * Admin Page — Protected by Server Component AdminGuard
 * The AdminGuard verifies JWT role server-side BEFORE rendering.
 * This prevents the brief flash of admin UI for non-admin users.
 */
export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
