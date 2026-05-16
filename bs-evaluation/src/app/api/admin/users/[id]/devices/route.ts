import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getDevicesByUser,
  approveDevice,
  rejectDevice,
  toggleDevice,
  deleteDevice,
  getPendingDevices,
} from '@/lib/db-operations';

/** GET — جلب أجهزة مستخدم أو جميع الأجهزة المعلقة */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const url = new URL(request.url);
    const pending = url.searchParams.get('pending');

    if (pending === 'all') {
      // جلب جميع الأجهزة المعلقة من كل المستخدمين
      const devices = await getPendingDevices();
      return NextResponse.json({ devices });
    }

    // جلب أجهزة مستخدم محدد
    const devices = await getDevicesByUser(id);
    return NextResponse.json({ devices });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

/** POST — الموافقة على جهاز أو رفضه */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();

    const { id: userId } = await params;
    const body = await request.json();
    const { action, deviceId } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'معرف الجهاز مطلوب' }, { status: 400 });
    }

    if (action === 'approve') {
      await approveDevice(deviceId, admin.userId);
      return NextResponse.json({ message: 'تمت الموافقة على الجهاز بنجاح' });
    }

    if (action === 'reject') {
      await rejectDevice(deviceId);
      return NextResponse.json({ message: 'تم رفض الجهاز' });
    }

    return NextResponse.json({ error: 'إجراء غير صالح — استخدم approve أو reject' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ في الخادم';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PUT — تفعيل/تعطيل جهاز */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: userId } = await params;
    const body = await request.json();
    const { deviceId, isActive } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'معرف الجهاز مطلوب' }, { status: 400 });
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive يجب أن يكون true أو false' }, { status: 400 });
    }

    await toggleDevice(deviceId, isActive);
    return NextResponse.json({
      message: isActive ? 'تم تفعيل الجهاز' : 'تم تعطيل الجهاز',
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

/** DELETE — حذف جهاز */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: userId } = await params;

    // محاولة قراءة deviceId من الجسم أو من معامل البحث
    let deviceId: string | null = null;
    try {
      const body = await request.json();
      deviceId = body.deviceId;
    } catch {
      // الجسم فارغ — نبحث في معاملات URL
      const url = new URL(request.url);
      deviceId = url.searchParams.get('deviceId');
    }

    if (!deviceId) {
      return NextResponse.json({ error: 'معرف الجهاز مطلوب' }, { status: 400 });
    }

    await deleteDevice(deviceId);
    return NextResponse.json({ message: 'تم حذف الجهاز' });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
