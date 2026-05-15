import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// JWT secret must be set via environment variable
const getJWTSecret = () => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }
  if (process.env.NODE_ENV !== 'production') {
    return new TextEncoder().encode('bs-evaluation-jwt-secret-2024-x9k2m-fallback-do-not-use-in-prod');
  }
  throw new Error('[CONFIG] JWT_SECRET is not set. Please add it to your .env.local file.');
};
const JWT_SECRET = getJWTSecret();

const authPages = ['/login', '/register', '/forgot-password'];
const staticPaths = ['/manifest.json', '/robots.txt'];
const publicApiPaths = ['/api/auth/login', '/api/auth/register'];

// Add no-cache headers to ALL responses to prevent stale content
function withNoCache(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js internals and static files — but add cache-busting headers
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
    return withNoCache(NextResponse.next());
  }

  // 3. Allow public API endpoints
  if (publicApiPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 4. Check auth
  const token = request.cookies.get('bs-session')?.value;

  if (!token) {
    // No token — authPages → allow (show login/register)
    if (authPages.some(p => pathname === p)) {
      return withNoCache(NextResponse.next());
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
    return withNoCache(resp);
  }

  // Verify the JWT token
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = (payload as Record<string, unknown>).role as string | undefined;

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

    return withNoCache(NextResponse.next());
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
    return withNoCache(response);
  }
}

// IMPORTANT: Match ALL routes including _next/static to add cache-control headers
// This prevents the browser from serving stale JavaScript bundles
export const config = {
  matcher: [
    '/((?!_next/image).*)',  // Match everything EXCEPT _next/image (which has its own optimization)
  ],
};
