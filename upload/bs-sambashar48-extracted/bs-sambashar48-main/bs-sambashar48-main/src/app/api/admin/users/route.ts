import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createUser, getAllUsers } from '@/lib/db-operations';
import { validateUsername, validatePasswordComplexity, validateFullName } from '@/lib/validation';

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

    // Validate username (same rules as self-registration)
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return NextResponse.json(
        { error: usernameCheck.error },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate password with complexity requirements
    const passwordCheck = validatePasswordComplexity(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate full name
    const nameCheck = validateFullName(fullName);
    if (!nameCheck.valid) {
      return NextResponse.json(
        { error: nameCheck.error },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const user = await createUser(
      (username as string).trim(),
      password as string,
      (fullName as string).trim(),
      'user'
    );
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
