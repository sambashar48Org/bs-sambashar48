import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/db-operations';

/**
 * POST /api/auth/register
 * Self-registration endpoint — new users get 'user' role by default.
 * Validates input, checks for duplicate usernames, hashes password, and creates the user.
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password, fullName } = await request.json();

    // Validate required fields
    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate username (min 3 chars)
    if (typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate password (min 8 chars)
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate fullName
    if (typeof fullName !== 'string' || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: 'الاسم الكامل مطلوب' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Check if username already exists
    const { supabase } = await import('@/lib/supabase');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'اسم المستخدم موجود بالفعل' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Create the user with 'user' role
    const user = await createUser(username.trim(), password, fullName.trim(), 'user');

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          createdAt: user.created_at,
        },
        message: 'تم إنشاء الحساب بنجاح',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل إنشاء الحساب';

    // Handle duplicate key error from Supabase
    if (message.includes('اسم المستخدم موجود بالفعل')) {
      return NextResponse.json(
        { error: 'اسم المستخدم موجود بالفعل' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
