import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;

  const users = await prisma.user.findMany({
    include: { familyMember: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      memberId: u.familyMemberId,
      memberName: u.familyMember ? `${u.familyMember.firstName} ${u.familyMember.lastName}` : null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { email?: string; password?: string; role?: string; memberId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'A valid email is required' }, { status: 400 });
  if (!body.password || String(body.password).length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: 'An account with this email already exists' }, { status: 409 });

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: bcrypt.hashSync(String(body.password), 10),
      role: body.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      status: 'ACTIVE',
      familyMemberId: body.memberId || null,
    },
  });
  await audit(user, 'user_created', 'user', created.id, null, { email });
  return Response.json({ id: created.id });
}