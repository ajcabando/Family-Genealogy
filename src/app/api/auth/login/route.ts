import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; remember?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) return Response.json({ error: 'Email and password are required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, include: { familyMember: { select: { id: true, firstName: true, lastName: true } } } });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  if (user.status === 'PENDING') {
    return Response.json({ error: 'Your account is awaiting administrator approval.' }, { status: 403 });
  }
  if (user.status === 'DISABLED') {
    return Response.json({ error: 'This account has been disabled. Contact an administrator.' }, { status: 403 });
  }

  const token = await createSessionToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.familyMember ? `${user.familyMember.firstName} ${user.familyMember.lastName}` : user.email,
      memberId: user.familyMemberId,
    },
    !!body.remember,
  );
  setSessionCookie(token, !!body.remember);

  return Response.json({ ok: true });
}