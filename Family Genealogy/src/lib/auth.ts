import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from './utils';

export type SessionUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  name: string;
  memberId?: string | null;
};

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me-please-32-chars-min');

const DAY = 60 * 60 * 24;

export async function createSessionToken(user: SessionUser, remember: boolean): Promise<string> {
  return new SignJWT({
    email: user.email,
    role: user.role,
    status: user.status,
    name: user.name,
    memberId: user.memberId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(remember ? '30d' : '12h')
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role) return null;
    return {
      id: payload.sub,
      email: (payload.email as string) || '',
      role: payload.role as SessionUser['role'],
      status: (payload.status as string) || '',
      name: (payload.name as string) || '',
      memberId: (payload.memberId as string) || null,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string, remember: boolean) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: remember ? 30 * DAY : 12 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

/** Server-component session (uses next/headers). */
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await verifySessionToken(token);
  if (!user || user.status !== 'ACTIVE') return null;
  return user;
}

/** Route-handler session (reads cookie from the request). */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await verifySessionToken(token);
  if (!user || user.status !== 'ACTIVE') return null;
  return user;
}

export type ApiResult = { json: (body: unknown, init?: ResponseInit) => Response };

export function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

export function badRequest(msg = 'Invalid request'): Response {
  return Response.json({ error: msg }, { status: 400 });
}

/** Lightweight CSRF protection for mutations: reject cross-origin requests. */
export function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // curl / server-to-server
  const host = req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}