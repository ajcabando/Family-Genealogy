import type { NextRequest } from 'next/server';
import { getSessionFromRequest, unauthorized, forbidden, badRequest, originAllowed } from './auth';
import type { SessionUser } from './auth';

export async function apiAuth(
  req: NextRequest,
  opts?: { admin?: boolean },
): Promise<{ user: SessionUser } | Response> {
  const user = await getSessionFromRequest(req);
  if (!user) return unauthorized();
  if (opts?.admin && user.role !== 'ADMIN') return forbidden();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !originAllowed(req)) return badRequest('Invalid request origin');
  return { user };
}

export function readJson(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  return {};
}