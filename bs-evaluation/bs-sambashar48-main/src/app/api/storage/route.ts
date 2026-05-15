import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/storage
 * List files from a Supabase Storage bucket/folder.
 * Query params: bucket, folder, limit (default: 20), offset (default: 0)
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await requireAuth();

    const ALLOWED_BUCKETS = ['evaluation-images'];
    const bucket = request.nextUrl.searchParams.get('bucket') || 'evaluation-images';
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'حاوية التخزين غير صالحة' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const folder = request.nextUrl.searchParams.get('folder') || 'uploads';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

    // List files from Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(folder, {
        limit,
        offset,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[Storage List Error]', error);
      return NextResponse.json(
        { error: 'فشل جلب الملفات' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Build public URLs for each file
    const files = (data || []).map((file) => {
      const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(`${folder}/${file.name}`);
      return {
        name: file.name,
        path: `${folder}/${file.name}`,
        url: urlData.publicUrl,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || '',
        createdAt: file.created_at,
      };
    });

    return NextResponse.json(
      { files, bucket, folder, limit, offset },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل جلب الملفات';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'غير مصرح به' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.error('[Storage List Error]', error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

/**
 * DELETE /api/storage
 * Delete a file from Supabase Storage.
 * Body: { bucket, path }
 * Requires authentication.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const session = await requireAuth();

    const { bucket, path } = await request.json();

    const ALLOWED_BUCKETS = ['evaluation-images'];
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'حاوية التخزين غير صالحة' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'حقل الحاوية والمسار مطلوبان' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Delete from Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('[Storage Delete Error]', error);
      return NextResponse.json(
        { error: 'فشل حذف الملف' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { message: 'تم حذف الملف بنجاح', deleted: data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل حذف الملف';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'غير مصرح به' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.error('[Storage Delete Error]', error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
