import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteUser, updateUserRole, updateUserCloudSync, getAllUsers, approveUser, rejectUser, toggleUserActive } from '@/lib/db-operations';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    // Prevent admin from changing their own role (would cause lockout)
    if (session.userId === id && body.role) {
      return NextResponse.json(
        { error: 'لا يمكنك تغيير دور حسابك الخاص' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ═══════ User Approval/Rejection ═══════
    if (body.isApproved !== undefined) {
      if (body.isApproved === true) {
        await approveUser(id, session.userId);
      } else if (body.isApproved === false) {
        await rejectUser(id);
      }
      return NextResponse.json(
        { success: true, message: body.isApproved ? 'تمت الموافقة على المستخدم' : 'تم رفض المستخدم' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ═══════ User Activation/Deactivation ═══════
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'isActive يجب أن يكون true أو false' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      // Prevent admin from deactivating themselves
      if (session.userId === id && !body.isActive) {
        return NextResponse.json(
          { error: 'لا يمكنك تعطيل حسابك الخاص' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      await toggleUserActive(id, body.isActive);
      return NextResponse.json(
        { success: true, message: body.isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Update role if provided
    if (body.role !== undefined) {
      if (body.role !== 'admin' && body.role !== 'user') {
        return NextResponse.json(
          { error: 'الدور يجب أن يكون admin أو user' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // Prevent demoting the last admin — would lock everyone out
      if (body.role === 'user') {
        const allUsers = await getAllUsers();
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'لا يمكن تخفيض دور المشرف الأخير — يجب أن يبقى مشرف واحد على الأقل' },
            { status: 400, headers: { 'Cache-Control': 'no-store' } }
          );
        }
      }

      await updateUserRole(id, body.role);
    }

    // Update cloud sync permission if provided
    if (body.cloudSyncEnabled !== undefined) {
      if (typeof body.cloudSyncEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'cloudSyncEnabled يجب أن يكون true أو false' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      await updateUserCloudSync(id, body.cloudSyncEnabled);
    }

    // Update max_devices if provided
    if (body.maxDevices !== undefined) {
      if (typeof body.maxDevices !== 'number' || body.maxDevices < 1 || body.maxDevices > 10) {
        return NextResponse.json(
          { error: 'maxDevices يجب أن يكون رقم بين 1 و 10' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      const { supabaseAdmin } = await import('@/lib/supabase');
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ max_devices: body.maxDevices })
        .eq('id', id);

      if (updateError) {
        return NextResponse.json(
          { error: 'فشل تحديث عدد الأجهزة المسموحة' },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: 'تم تحديث المستخدم بنجاح' },
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    // Prevent admin from deleting their own account (would cause lockout)
    if (session.userId === id) {
      return NextResponse.json(
        { error: 'لا يمكنك حذف حسابك الخاص' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Prevent deleting the last admin
    const allUsers = await getAllUsers();
    const targetUser = allUsers.find(u => u.id === id);
    if (targetUser?.role === 'admin') {
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'لا يمكن حذف المشرف الأخير — يجب أن يبقى مشرف واحد على الأقل' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    await deleteUser(id);
    return NextResponse.json({ success: true }, {
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
