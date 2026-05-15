import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { authenticateUser, checkDevice, registerDevice } from '@/lib/db-operations';

/**
 * In-memory rate limiter for login attempts.
 * Tracks failed attempts per username to prevent brute-force attacks.
 * Resets after 15 minutes of inactivity.
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(username: string): { limited: boolean; retryAfter?: number } {
  const record = loginAttempts.get(username.toLowerCase());
  if (!record) return { limited: false };

  if (Date.now() - record.lastAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(username.toLowerCase());
    return { limited: false };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((LOCKOUT_WINDOW_MS - (Date.now() - record.lastAttempt)) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

function recordFailedAttempt(username: string) {
  const key = username.toLowerCase();
  const record = loginAttempts.get(key);
  if (record) {
    record.count++;
    record.lastAttempt = Date.now();
  } else {
    loginAttempts.set(key, { count: 1, lastAttempt: Date.now() });
  }
}

function clearFailedAttempts(username: string) {
  loginAttempts.delete(username.toLowerCase());
}

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    if (now - record.lastAttempt > LOCKOUT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const { username, password, deviceFingerprint, deviceName, fullFingerprint } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Rate limiting check
    const rateCheck = isRateLimited(username);
    if (rateCheck.limited) {
      return NextResponse.json(
        {
          error: `تم تجاوز عدد المحاولات المسموحة. حاول مرة أخرى بعد ${rateCheck.retryAfter} ثانية`,
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(rateCheck.retryAfter),
          },
        }
      );
    }

    try {
      const user = await authenticateUser(username, password);
      clearFailedAttempts(username);

      // ═══════ Hybrid Device Fingerprint Check ═══════
      // المدير يتجاوز فحص الجهاز
      if (user.role !== 'admin' && deviceFingerprint) {
        const deviceCheck = await checkDevice(user.id, deviceFingerprint);

        if (!deviceCheck.known) {
          // جهاز جديد — تسجيله بانتظار الموافقة
          try {
            await registerDevice(
              user.id,
              deviceFingerprint,
              deviceName || 'Unknown Device',
              fullFingerprint || deviceFingerprint
            );
          } catch (regError: unknown) {
            const msg = regError instanceof Error ? regError.message : '';
            if (msg.includes('الحد الأقصى')) {
              return NextResponse.json(
                { error: msg, status: 'device_limit_reached' },
                { status: 403, headers: { 'Cache-Control': 'no-store' } }
              );
            }
          }

          // إرجاع حالة "بانتظار الموافقة" — بدون token
          return NextResponse.json(
            {
              status: 'pending_approval',
              message: 'جهاز جديد — بانتظار موافقة المدير',
              deviceName: deviceName || 'Unknown Device',
              userId: user.id,
              username: user.username,
            },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        }

        if (!deviceCheck.approved) {
          // الجهاز مسجل لكن لم تتم الموافقة بعد
          return NextResponse.json(
            {
              status: 'pending_approval',
              message: 'جهازك بانتظار موافقة المدير',
              deviceName: deviceCheck.device?.device_name || 'Unknown Device',
              userId: user.id,
              username: user.username,
            },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        }
      }

      // ═══════ تسجيل الدخول الناجح ═══════
      const token = await signToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      const response = NextResponse.json(
        {
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            cloudSyncEnabled: user.cloud_sync_enabled,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );

      response.cookies.set('bs-session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    } catch {
      recordFailedAttempt(username);
      const attempts = loginAttempts.get(username.toLowerCase());
      const remaining = attempts ? MAX_ATTEMPTS - attempts.count : MAX_ATTEMPTS;

      return NextResponse.json(
        {
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
          remainingAttempts: remaining,
        },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'خطأ في تسجيل الدخول' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
