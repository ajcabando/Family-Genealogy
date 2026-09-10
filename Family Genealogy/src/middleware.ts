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

  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isApi = pathname.startsWith('/api');

  if (!session || session.status !== 'ACTIVE') {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminPath && session.role !== 'ADMIN') {
    if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};