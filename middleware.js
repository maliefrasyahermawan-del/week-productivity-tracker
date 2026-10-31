import { NextResponse } from 'next/server';

const PUBLIC = ['/login', '/register', '/forgot-password'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals and public auth API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    PUBLIC.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
