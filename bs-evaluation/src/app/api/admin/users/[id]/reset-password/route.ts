import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { changePassword } from '@/lib/db-operations';
import { validatePasswordComplexity } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { newPassword } = await request.json();

    // Validate new password with complexity requirements
    const passwordCheck = validatePasswordComplexity(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.error },
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
