import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { authenticateUser, checkDevice, registerDevice } from '@/lib/db-operations';

/**
 * In-memory rate limiter for login attempts.
 * Tracks failed attempts per username to prevent brute-force attacks.
 * Resets after 15 minutes of inactivity.
 *
 * NOTE: For multi-instance deployments (serverless), replace with
 * Redis/Upstash rate limiting for distributed consistency.
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

      // ═══════ فحص حالة الحساب (موافقة + تفعيل) ═══════
      // SECURITY: Check user-level approval BEFORE device check
      const userApproved = (user as Record<string, unknown>).is_approved !== false; // default true if missing
      const userActive = (user as Record<string, unknown>).is_active !== false; // default true if missing

      if (!userApproved) {
        return NextResponse.json(
          {
            status: 'pending_approval',
            reason: 'account_pending',  // الحساب بانتظار موافقة المدير
            message: 'حسابك بانتظار موافقة المدير',
            username: user.username,
            userId: user.id,
          },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      if (!userActive) {
        return NextResponse.json(
          {
            status: 'account_disabled',
            reason: 'account_disabled',  // الحساب معطّل من المدير
            message: 'تم تعطيل حسابك من قِبل المدير — تواصل مع المشرف',
            username: user.username,
            userId: user.id,
          },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // ═══════ Hybrid Device Fingerprint Check ═══════
      // SECURITY: ALL users (including admin) must pass device fingerprint check
      // Admin devices are auto-approved, but still tracked for audit purposes
      if (deviceFingerprint) {
        const deviceCheck = await checkDevice(user.id, deviceFingerprint);

        if (!deviceCheck.known) {
          // جهاز جديد
          if (user.role === 'admin') {
            // المدير: تسجيل الجهاز والموافقة التلقائية
            try {
              await registerDevice(
                user.id,
                deviceFingerprint,
                deviceName || 'Admin Device',
                fullFingerprint || deviceFingerprint
              );
              // الموافقة التلقائية لأجهزة المدير
              const { supabaseAdmin } = await import('@/lib/supabase');
              const { data: newDevice } = await supabaseAdmin
                .from('devices')
                .select('id')
                .eq('user_id', user.id)
                .eq('device_id', deviceFingerprint)
                .single();
              if (newDevice) {
                await (await import('@/lib/db-operations')).approveDevice(newDevice.id, user.id);
              }
            } catch (regError: unknown) {
              const msg = regError instanceof Error ? regError.message : '';
              if (msg.includes('الحد الأقصى')) {
                return NextResponse.json(
                  { error: 'تم بلوغ الحد الأقصى لأجهزة المدير. تواصل مع الدعم.', status: 'device_limit_reached' },
                  { status: 403, headers: { 'Cache-Control': 'no-store' } }
                );
              }
              // If auto-approval fails, still allow admin login (don't block admin)
              console.warn('[AUTH] Admin device auto-approval failed:', msg);
            }
          } else {
            // مستخدم عادي: تسجيل الجهاز بانتظار الموافقة
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

            // إرجاع حالة "بانتظار الموافقة" — بدون token أو بيانات حساسة
            return NextResponse.json(
              {
                status: 'pending_approval',
                reason: 'device_pending',  // الجهاز بانتظار موافقة المدير
                message: 'جهاز جديد — بانتظار موافقة المدير',
                deviceName: deviceName || 'Unknown Device',
                username: user.username,
                userId: user.id,
              },
              { headers: { 'Cache-Control': 'no-store' } }
            );
          }
        } else if (!deviceCheck.approved && user.role !== 'admin') {
          // الجهاز مسجل لكن لم تتم الموافقة بعد (للمستخدم العادي فقط)
          return NextResponse.json(
            {
              status: 'pending_approval',
              reason: 'device_pending',  // الجهاز مسجل لكن بانتظار الموافقة
              message: 'جهازك بانتظار موافقة المدير',
              deviceName: deviceCheck.device?.device_name || 'Unknown Device',
              username: user.username,
              userId: user.id,
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
        passwordVersion: user.password_version || 1,
      });

      const response = NextResponse.json(
        {
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            cloudSyncEnabled: user.cloud_sync_enabled,
            mustChangePassword: user.must_change_password ?? false,
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
