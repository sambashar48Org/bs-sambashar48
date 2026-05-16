import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
  response.cookies.set('bs-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
