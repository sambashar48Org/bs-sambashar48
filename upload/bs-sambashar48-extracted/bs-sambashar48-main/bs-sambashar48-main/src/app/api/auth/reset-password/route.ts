import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { changePassword } from '@/lib/db-operations';
import { validatePasswordComplexity } from '@/lib/validation';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/auth/reset-password — Reset user password (Admin only or self-service)
 * Requires authenticated session. Only admins can reset other users' passwords.
 * Regular users can only reset their own password by providing current password.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح - يجب تسجيل الدخول أولاً' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { username, newPassword, confirmPassword, currentPassword } = await request.json();

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'كلمة المرور الجديدة وتأكيدها مطلوبان' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'كلمات المرور غير متطابقة' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Password complexity check
    const passwordCheck = validatePasswordComplexity(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Admin can reset any user's password
    // Regular users can only reset their own password (must provide current password)
    let targetUserId: string | null = null;

    if (session.role === 'admin' && username) {
      // Admin resetting another user's password — use supabaseAdmin to bypass RLS
      const { data: targetUser, error: findError } = await supabaseAdmin
        .from('users')
        .select('id, username')
        .eq('username', username.trim())
        .single();

      if (findError || !targetUser) {
        return NextResponse.json(
          { error: 'المستخدم غير موجود' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      targetUserId = targetUser.id;
    } else if (!username || username.trim() === session.username) {
      // User resetting their own password - require current password
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'يجب إدخال كلمة المرور الحالية' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // Use supabaseAdmin to bypass RLS
      const { data: userData, error: findError } = await supabaseAdmin
        .from('users')
        .select('id, password_hash')
        .eq('id', session.userId)
        .single();

      if (findError || !userData) {
        return NextResponse.json(
          { error: 'المستخدم غير موجود' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, userData.password_hash);
      if (!isMatch) {
        return NextResponse.json(
          { error: 'كلمة المرور الحالية غير صحيحة' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      targetUserId = session.userId;
    } else {
      return NextResponse.json(
        { error: 'غير مصرح - لا يمكنك تغيير كلمة مرور مستخدم آخر' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Change password (also clears must_change_password flag)
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'لم يتم تحديد المستخدم' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    await changePassword(targetUserId, newPassword);

    return NextResponse.json(
      {
        success: true,
        message: 'تم تحديث كلمة المرور بنجاح',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
