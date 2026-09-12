import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const email = (body.email || '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ message: 'If that email exists, a reset link has been generated.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3844';
  const resetLink = `${appUrl}/reset?token=${token}`;
  // MVP has no email provider configured — the reset link is returned to the client.
  return Response.json({ message: 'Reset link generated.', resetLink });
}