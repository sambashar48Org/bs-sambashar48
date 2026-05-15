import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { changePassword } from '@/lib/db-operations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { newPassword } = await request.json();

    // Validate new password
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'كلمة المرور الجديدة مطلوبة' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    await changePassword(id, newPassword);
    return NextResponse.json(
      { success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
