import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    // Check if users table exists
    const { error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({ message: 'Database already initialized', status: 'ok' });
    }

    return NextResponse.json({
      message: 'Database needs initialization. Please run the SQL in supabase-setup.sql in your Supabase SQL Editor.',
      status: 'needs_setup',
    });
  } catch {
    return NextResponse.json({ error: 'Connection error' }, { status: 500 });
  }
}
