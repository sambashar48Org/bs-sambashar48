import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createUser, getAllUsers } from '@/lib/db-operations';

export async function GET() {
  try {
    await requireAdmin();
    const users = await getAllUsers();
    return NextResponse.json(users, {
      headers: { 'Cache-Control': 'no-store' },
    });
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

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { username, password, fullName } = await request.json();

    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Enforce password policy: min 8 characters
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const user = await createUser(username, password, fullName, 'user');
    return NextResponse.json(user, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    // Distinguish validation errors (400) from server errors (500)
    if (message.includes('موجود بالفعل')) {
      return NextResponse.json({ error: message }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
