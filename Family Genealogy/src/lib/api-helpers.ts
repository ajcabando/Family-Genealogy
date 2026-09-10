import type { NextRequest } from 'next/server';
import { getSessionFromRequest, unauthorized, forbidden, badRequest, originAllowed } from './auth';
import type { SessionUser } from './auth';

type AuthOptions = { admin?: boolean; publicGet?: boolean };
// A non-Response result always carries a user unless `publicGet` explicitly
// allowed an anonymous visitor through.
type AuthResult<O extends AuthOptions> = O extends { publicGet: true } ? { user: SessionUser | null } : { user: SessionUser };

/**
 * Auth for route handlers.
 * - admin:   requires an ADMIN session
 * - publicGet: allows anonymous GET/HEAD/OPTIONS (returns user: null) — the
 *   archive is viewable by everyone; only edits require an account. Mutations
 *   always require a session.
 */
export async function apiAuth<O extends AuthOptions>(
  req: NextRequest,
  opts?: O,
): Promise<AuthResult<O> | Response> {
  const method = req.method;
  const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const user = await getSessionFromRequest(req);

  if (!user) {
    if (readOnly && opts?.publicGet) return { user: null } as AuthResult<O>;
    return unauthorized();
  }
  if (opts?.admin && user.role !== 'ADMIN') return forbidden();
  if (!readOnly && !originAllowed(req)) return badRequest('Invalid request origin');
  return { user } as AuthResult<O>;
}

export function readJson(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  return {};
}