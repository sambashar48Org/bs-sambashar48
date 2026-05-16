import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/setup — Check if DB is initialized
 * REQUIRES ADMIN AUTHENTICATION — prevents information disclosure
 */
export async function POST() {
  try {
    // Require admin authentication to prevent unauthorized DB probing
    await requireAdmin();

    // Check if users table exists
    const { error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({ message: 'Database already initialized', status: 'ok' });
    }

    return NextResponse.json({
      message: 'Database needs initialization. Please run the SQL in supabase-setup-secure.sql in your Supabase SQL Editor.',
      status: 'needs_setup',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: 'Connection error' }, { status: 500 });
  }
}
