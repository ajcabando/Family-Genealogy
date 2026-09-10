import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

  let body: { status?: string; role?: string; familyMemberId?: string | null; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.status) {
    if (!['ACTIVE', 'PENDING', 'DISABLED'].includes(body.status)) return Response.json({ error: 'Invalid status' }, { status: 400 });
    data.status = body.status;
  }
  if (body.role) {
    if (!['ADMIN', 'MEMBER'].includes(body.role)) return Response.json({ error: 'Invalid role' }, { status: 400 });
    data.role = body.role;
  }
  if (body.familyMemberId !== undefined) {
    if (body.familyMemberId) {
      const member = await prisma.familyMember.findUnique({ where: { id: body.familyMemberId } });
      if (!member) return Response.json({ error: 'Family member not found' }, { status: 400 });
    }
    data.familyMemberId = body.familyMemberId || null;
  }
  if (body.password) {
    if (String(body.password).length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    data.passwordHash = bcrypt.hashSync(String(body.password), 10);
  }

  if (Object.keys(data).length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  await prisma.user.update({ where: { id: target.id }, data: data as never });
  await audit(user, 'user_updated', 'user', target.id, { email: target.email }, data);
  return Response.json({ ok: true });
}