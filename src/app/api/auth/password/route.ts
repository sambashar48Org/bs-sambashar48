import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken } from '@/lib/auth';
import { authenticateUser, changePassword } from '@/lib/db-operations';
import { validatePasswordComplexity } from '@/lib/validation';

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

    // Password complexity check
    const passwordCheck = validatePasswordComplexity(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.error },
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

    // Apply the password change (also clears must_change_password flag)
    // Returns the new password_version for JWT invalidation
    const newVersion = await changePassword(session.userId, newPassword);

    // Issue a new JWT with updated passwordVersion to invalidate any old compromised tokens
    const newToken = await signToken({
      userId: session.userId,
      username: session.username,
      role: session.role,
      passwordVersion: newVersion,
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
