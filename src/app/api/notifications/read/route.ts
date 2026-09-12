import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  await prisma.notification.updateMany({
    where: { userId: auth.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return Response.json({ ok: true });
}