import { NextResponse } from 'next/server';
import { getSession, clearSessionResponse } from '@/lib/auth';
import { getUserById } from '@/lib/db-operations';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    let user: { id: string; username: string; full_name: string; role: string; cloud_sync_enabled: boolean; must_change_password: boolean };
    try {
      user = await getUserById(session.userId);
      if (!user) {
        // User was explicitly deleted from DB — clear the session
        return clearSessionResponse('الجلسة منتهية، يرجى تسجيل الدخول مجدداً', 401);
      }
    } catch (err) {
      // DB/timeout error — do NOT clear the session, return 500 instead
      console.error('[/api/auth/me] DB error:', err);
      return NextResponse.json(
        { error: 'خطأ مؤقت في التحقق من الجلسة، يرجى المحاولة لاحقاً' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      cloudSyncEnabled: user.cloud_sync_enabled ?? false,
      mustChangePassword: user.must_change_password ?? false,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في التحقق من الجلسة' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
