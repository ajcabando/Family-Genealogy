import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const token = body.token || '';
  const password = body.password || '';
  if (!token || password.length < 8) {
    return Response.json({ error: 'A valid token and a password of at least 8 characters are required' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return Response.json({ error: 'This reset link is invalid or has expired' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: bcrypt.hashSync(password, 10) } }),
  ]);

  return Response.json({ ok: true });
}