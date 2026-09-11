import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req, { publicGet: true });
  if (auth instanceof Response) return auth;

  const albums = await prisma.reunionAlbum.findMany({
    include: {
      _count: { select: { photos: true } },
      reunionEvent: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({
    albums: albums.map((a) => ({
      id: a.id,
      name: a.name,
      eventName: a.reunionEvent.name,
      photoCount: a._count.photos,
    })),
  });
}
