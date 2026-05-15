import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getProjectById, updateProject, deleteProject } from '@/lib/db-operations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const project = await getProjectById(id);

    // Users can only see their own projects
    if (session.role !== 'admin' && project.user_id !== session.userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const project = await getProjectById(id);
    if (session.role !== 'admin' && project.user_id !== session.userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const updated = await updateProject(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await getProjectById(id);
    if (session.role !== 'admin' && project.user_id !== session.userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
