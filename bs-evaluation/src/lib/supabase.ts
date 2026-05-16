import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy-initialized Supabase clients.
 * Defers validation until first actual use to prevent module-level crashes
 * when environment variables are not yet set (e.g., fresh workspace).
 */

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url === 'PLACEHOLDER' || !url.startsWith('http')) {
    throw new Error(
      '[CONFIG] NEXT_PUBLIC_SUPABASE_URL is not set or invalid. ' +
      'Please add it to your .env file. ' +
      'Format: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co'
    );
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key === 'PLACEHOLDER') {
    throw new Error(
      '[CONFIG] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
      'Please add it to your .env file.'
    );
  }
  return key;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    const value = (_supabase as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(_supabase);
    }
    return value;
  },
});

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey || serviceKey === 'PLACEHOLDER') {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            '[SECURITY] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
            'Admin operations cannot proceed without it in production. ' +
            'Please add it to your .env.local file.'
          );
        }
        console.warn(
          '[SECURITY WARNING] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
          'Falling back to anon key — admin operations may fail due to RLS. ' +
          'Set SUPABASE_SERVICE_ROLE_KEY for proper admin access.'
        );
      }
      _supabaseAdmin = createClient(getSupabaseUrl(), serviceKey || getSupabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    const value = (_supabaseAdmin as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(_supabaseAdmin);
    }
    return value;
  },
});
