import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getProjects, createProject } from '@/lib/db-operations';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await getProjects(session.userId, session.role === 'admin');
    return NextResponse.json(projects);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin can also create projects

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'اسم المشروع مطلوب' }, { status: 400 });
    }

    const project = await createProject(session.userId, name);
    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
