import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/db-operations';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Emergency Admin Activation Endpoint
 *
 * When the admin account gets disabled (is_active = false), no one can log in
 * to re-enable it because ALL admin API endpoints require authentication.
 * This creates a deadlock. This endpoint breaks the deadlock by:
 * 1. Verifying the admin's username + password (proves identity)
 * 2. Re-activating the admin account
 * 3. Approving the admin account (if it was also unapproved)
 *
 * Security measures:
 * - Requires correct admin password
 * - Only works for admin role users
 * - Logs the emergency activation
 * - Can only activate admin accounts (not regular users)
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Step 1: Verify credentials (authenticateUser checks password via bcrypt)
    let user;
    try {
      user = await authenticateUser(username, password);
    } catch {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Step 2: Only admin accounts can be emergency-activated
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'هذه العملية متاحة فقط لحسابات المديرين' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Step 3: Check current status
    const isActive = (user as Record<string, unknown>).is_active !== false;
    const isApproved = (user as Record<string, unknown>).is_approved !== false;

    if (isActive && isApproved) {
      return NextResponse.json(
        { message: 'حساب المدير مفعّل بالفعل — لا حاجة لإعادة التفعيل', alreadyActive: true },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Step 4: Re-activate and approve the admin account
    const updates: Record<string, unknown> = {};

    if (!isActive) {
      updates.is_active = true;
    }
    if (!isApproved) {
      updates.is_approved = true;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        console.error('[EMERGENCY-ACTIVATE] Failed to update admin:', updateError);
        return NextResponse.json(
          { error: 'فشل إعادة تفعيل الحساب — حاول مرة أخرى' },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Step 5: Also approve all devices for admin (emergency)
    const { error: deviceError } = await supabaseAdmin
      .from('devices')
      .update({ is_approved: true })
      .eq('user_id', user.id);

    if (deviceError) {
      console.warn('[EMERGENCY-ACTIVATE] Could not approve devices:', deviceError.message);
      // Non-fatal — continue
    }

    console.log(`[EMERGENCY-ACTIVATE] Admin "${username}" re-activated successfully. Updates:`, Object.keys(updates).join(', '));

    return NextResponse.json(
      {
        success: true,
        message: 'تم إعادة تفعيل حساب المدير بنجاح — يمكنك الآن تسجيل الدخول',
        activatedFields: Object.keys(updates),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (error: unknown) {
    console.error('[EMERGENCY-ACTIVATE] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'خطأ غير متوقع';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
