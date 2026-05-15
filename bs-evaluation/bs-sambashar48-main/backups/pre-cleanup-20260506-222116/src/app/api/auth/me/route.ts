import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db-operations';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
