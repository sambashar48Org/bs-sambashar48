import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken } from '@/lib/auth';
import { authenticateUser, changePassword } from '@/lib/db-operations';

/**
 * PUT /api/auth/password — Change user's password
 * Requires authenticated session + verification of current password
 * Issues a new JWT to invalidate any compromised tokens
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // Password policy: min 8 chars, max 128 chars
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // Verify current password before allowing change
    try {
      await authenticateUser(session.username, currentPassword);
    } catch {
      return NextResponse.json(
        { error: 'كلمة المرور الحالية غير صحيحة' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // Apply the password change
    await changePassword(session.userId, newPassword);

    // Issue a new JWT to effectively invalidate any old compromised tokens
    const newToken = await signToken({
      userId: session.userId,
      username: session.username,
      role: session.role,
    });

    const response = NextResponse.json(
      { success: true, message: 'تم تغيير كلمة المرور بنجاح' },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );

    // Replace the old cookie with the new token
    response.cookies.set('bs-session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ في تغيير كلمة المرور';
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
