import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

/** GET /api/reunions/albums/:albumId — album details + approved photo ids (for the cover picker). */
export async function GET(req: NextRequest, { params }: { params: { albumId: string } }) {
  const auth = await apiAuth(req, { publicGet: true });
  if (auth instanceof Response) return auth;

  const album = await prisma.reunionAlbum.findUnique({
    where: { id: params.albumId },
    include: { reunionEvent: { select: { id: true, name: true } } },
  });
  if (!album) return Response.json({ error: 'Album not found' }, { status: 404 });

  const photos = await prisma.albumPhoto.findMany({
    where: { albumId: album.id, photo: { approvalStatus: 'APPROVED', deletedAt: null } },
    include: { photo: { select: { id: true, thumbPath: true, caption: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({
    id: album.id,
    name: album.name,
    description: album.description,
    coverPhotoId: album.coverPhotoId,
    reunionEvent: album.reunionEvent,
    photos: photos.map((p) => p.photo),
  });
}
