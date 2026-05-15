import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getProjectById, updateProject, deleteProject } from '@/lib/db-operations';
import { supabase } from '@/lib/supabase';

/**
 * Whitelist of fields allowed in project updates.
 * Prevents Mass Assignment attacks (e.g., overwriting user_id, created_at, etc.)
 */
const ALLOWED_UPDATE_FIELDS = new Set([
  'name',
  'is_current',
  'building_data',
  'architectural_report',
  'structural_report',
  'foundations',
  'columns_walls',
  'beam_slab',
  'electrical',
  'plumbing',
  'technical_notes',
  'final_report',
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const { id } = await params;
    const project = await getProjectById(id);

    // Users can only see their own projects
    if (session.role !== 'admin' && project.user_id !== session.userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(project, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    const status = message.includes('غير موجود') ? 404 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const project = await getProjectById(id);
    if (session.role !== 'admin' && project.user_id !== session.userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    // When setting is_current=true, unset all other projects for this user first
    if (body.is_current === true) {
      await supabase
        .from('projects')
        .update({ is_current: false })
        .eq('user_id', session.userId);
    }

    // Whitelist: only allow known safe fields (Mass Assignment prevention)
    const sanitizedBody: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        sanitizedBody[key] = body[key];
      }
    }

    const updated = await updateProject(id, sanitizedBody);
    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    const status = message.includes('غير موجود') ? 404 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const { id } = await params;

    const project = await getProjectById(id);
    if (session.role !== 'admin' && project.user_id !== session.userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    await deleteProject(id);
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    const status = message.includes('غير موجود') ? 404 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
