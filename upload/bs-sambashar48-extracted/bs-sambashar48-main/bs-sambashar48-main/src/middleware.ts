import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJWTSecretBytes } from '@/lib/jwt-secret';
import { supabaseAdmin } from '@/lib/supabase';

const authPages = ['/login', '/register', '/forgot-password'];
const staticPaths = ['/manifest.json', '/robots.txt'];
const publicApiPaths = ['/api/auth/login', '/api/auth/register'];

// Add security headers + no-cache to ALL responses
function withSecurityHeaders(response: NextResponse): NextResponse {
  // No-cache headers (prevent stale content)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  // HSTS — only in production (requires HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content-Security-Policy — restrict resource loading
  // NOTE: unsafe-inline/unsafe-eval are required by Next.js + Tailwind CSS
  // TODO: Migrate to nonce-based CSP when Next.js supports it natively in middleware
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required by Next.js runtime
      "style-src 'self' 'unsafe-inline'", // Required by Tailwind CSS
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
    ].join('; ')
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/logo') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.zip') ||
    pathname.endsWith('.pdf') ||
    pathname.endsWith('.sql')
  ) {
    return NextResponse.next();
  }

  // 2. Allow static paths (manifest, robots)
  if (staticPaths.some(p => pathname === p)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 3. Allow public API endpoints (but add rate limiting headers info)
  if (publicApiPaths.some(p => pathname.startsWith(p))) {
    return withSecurityHeaders(NextResponse.next());
  }

  // 4. Check auth
  const token = request.cookies.get('bs-session')?.value;

  if (!token) {
    // No token — authPages → allow (show login/register)
    if (authPages.some(p => pathname === p)) {
      return withSecurityHeaders(NextResponse.next());
    }
    // No token — API → 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // No token — pages → redirect to /login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    const resp = NextResponse.redirect(loginUrl);
    return withSecurityHeaders(resp);
  }

  // Verify the JWT token
  try {
    const { payload } = await jwtVerify(token, getJWTSecretBytes());
    const role = (payload as Record<string, unknown>).role as string | undefined;
    const userId = (payload as Record<string, unknown>).userId as string | undefined;
    const jwtPasswordVersion = (payload as Record<string, unknown>).passwordVersion as number | undefined;

    // ═══════ Session Invalidation Check ═══════
    // If the user's password was changed, their password_version in the DB
    // will be higher than the version in the JWT. Invalidate the session.
    // NOTE: If password_version column doesn't exist yet (pre-migration),
    // this check is skipped gracefully — the JWT won't have passwordVersion either.
    if (userId && jwtPasswordVersion !== undefined) {
      try {
        const { data: dbUser, error: dbError } = await supabaseAdmin
          .from('users')
          .select('password_version')
          .eq('id', userId)
          .single();

        // If column doesn't exist (error code 42703), skip the check
        if (dbError && (dbError.code === '42703' || (dbError.message?.includes('does not exist') ?? false))) {
          // password_version column not yet added — skip session invalidation check
        } else if (dbUser && dbUser.password_version !== undefined && dbUser.password_version !== jwtPasswordVersion) {
          // Password was changed — this JWT is stale, invalidate it
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = '/login';
          loginUrl.searchParams.set('reason', 'session_expired');
          const staleResponse = NextResponse.redirect(loginUrl);
          staleResponse.cookies.set('bs-session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
          });
          return withSecurityHeaders(staleResponse);
        }
      } catch {
        // If DB check fails, allow the request through (don't block on DB errors)
        console.warn('[MIDDLEWARE] Failed to check password_version for user:', userId);
      }
    }

    // If authenticated user visits auth pages, redirect to home
    if (authPages.some(p => pathname === p)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }

    // Admin routes: only admin role can access
    if (pathname.startsWith('/admin') && role !== 'admin') {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }

    return withSecurityHeaders(NextResponse.next());
  } catch {
    // Token is invalid or expired
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('bs-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return withSecurityHeaders(response);
  }
}

// IMPORTANT: Match ALL routes including _next/static to add cache-control headers
// This prevents the browser from serving stale JavaScript bundles
export const config = {
  matcher: [
    '/((?!_next/image).*)',  // Match everything EXCEPT _next/image (which has its own optimization)
  ],
};
