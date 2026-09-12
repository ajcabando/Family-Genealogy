import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from './lib/utils';

const PUBLIC = [
  '/login',
  '/register',
  '/reset',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset/request',
  '/api/auth/reset',
  '/_next',
  '/favicon.ico',
  // PWA static assets — must be fetchable before any session exists
  '/manifest.webmanifest',
  '/sw.js',
  '/icons',
];

const isPublic = (pathname: string) => PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let session: { role?: string; status?: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me-please-32-chars-min'));
      session = payload as { role?: string; status?: string };
    } catch {
      session = null;
    }
  }

  // The archive is public to view; only admin management stays gated. Page and
  // API route handlers additionally enforce their own auth for any mutation.
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isAdminPath && (!session || session.status !== 'ACTIVE' || session.role !== 'ADMIN')) {
    const isApi = pathname.startsWith('/api');
    if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};