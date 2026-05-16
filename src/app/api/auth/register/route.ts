import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/db-operations';
import { validatePasswordComplexity } from '@/lib/validation';

/**
 * In-memory rate limiter for registration attempts.
 * Prevents automated account creation / spam registration.
 */
const registrationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_REGISTRATION_ATTEMPTS = 3;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRegistrationRateLimited(ip: string): boolean {
  const record = registrationAttempts.get(ip);
  if (!record) return false;

  if (Date.now() - record.lastAttempt > REGISTRATION_WINDOW_MS) {
    registrationAttempts.delete(ip);
    return false;
  }

  return record.count >= MAX_REGISTRATION_ATTEMPTS;
}

function recordRegistrationAttempt(ip: string) {
  const record = registrationAttempts.get(ip);
  if (record) {
    record.count++;
    record.lastAttempt = Date.now();
  } else {
    registrationAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  }
}

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of registrationAttempts) {
    if (now - record.lastAttempt > REGISTRATION_WINDOW_MS) {
      registrationAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * POST /api/auth/register
 * Self-registration endpoint — new users get 'user' role by default.
 * Validates input, checks for duplicate usernames, hashes password, and creates the user.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (isRegistrationRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد محاولات التسجيل. حاول مرة أخرى بعد ساعة' },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { username, password, fullName } = await request.json();

    // Validate required fields
    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate username (min 3 chars, alphanumeric + underscore only)
    if (typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Prevent usernames that look like SQL injection or contain special chars
    if (!/^[a-zA-Z0-9_\u0600-\u06FF]+$/.test(username.trim())) {
      return NextResponse.json(
        { error: 'اسم المستخدم يجب أن يحتوي فقط على أحرف وأرقام وشرطة سفلية' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate password with complexity requirements
    // SECURITY: Self-registration now requires same complexity as admin-created passwords
    const passwordCheck = validatePasswordComplexity(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.error },
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

    // Check if username already exists — use supabaseAdmin to bypass strict RLS
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .single();

    if (existingUser) {
      recordRegistrationAttempt(clientIp);
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
