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
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

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

/** POST — الموافقة على جهاز */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'approve' | 'reject'

    if (action === 'approve') {
      await approveDevice(id, admin.userId);
      return NextResponse.json({ message: 'تمت الموافقة على الجهاز بنجاح' });
    }

    if (action === 'reject') {
      await rejectDevice(id);
      return NextResponse.json({ message: 'تم رفض الجهاز' });
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
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
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    await toggleDevice(id, isActive);
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
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    await deleteDevice(id);
    return NextResponse.json({ message: 'تم حذف الجهاز' });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
