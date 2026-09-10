import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getSettingBool } from '@/lib/settings';

export async function POST(req: NextRequest) {
  const allow = await getSettingBool('allowRegistration');
  if (!allow) return Response.json({ error: 'Registration is currently closed' }, { status: 403 });

  let body: { firstName?: string; lastName?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'A valid email is required' }, { status: 400 });
  if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: 'An account with this email already exists' }, { status: 409 });

  const user = await prisma.user.create({
    data: { email, passwordHash: bcrypt.hashSync(password, 10), role: 'MEMBER', status: 'PENDING' },
  });

  // Notify all admins of the pending request
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: 'REQUEST',
      title: 'New registration request',
      body: `${body.firstName || ''} ${body.lastName || ''} (${email}) requested access to the family archive.`,
      link: '/admin/users',
    })),
  });

  return Response.json({ ok: true, userId: user.id });
}