import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const limit = Math.min(50, Number(new URL(req.url).searchParams.get('limit')) || 10);

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: auth.user.id }, orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.notification.count({ where: { userId: auth.user.id, readAt: null } }),
  ]);

  return Response.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt ? n.readAt.toISOString() : null,
    })),
  });
}