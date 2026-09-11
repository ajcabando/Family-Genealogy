import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

/** PUT /api/reunions/albums/:albumId/cover — pin (photoId) or unpin (null) the album cover. */
export async function PUT(req: NextRequest, { params }: { params: { albumId: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { photoId?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const album = await prisma.reunionAlbum.findUnique({ where: { id: params.albumId } });
  if (!album) return Response.json({ error: 'Album not found' }, { status: 404 });

  const photoId = body.photoId || null;
  if (photoId) {
    const inAlbum = await prisma.albumPhoto.findUnique({
      where: { albumId_photoId: { albumId: album.id, photoId } },
    });
    if (!inAlbum) return Response.json({ error: 'Photo is not in this album' }, { status: 400 });
  }

  await prisma.reunionAlbum.update({ where: { id: album.id }, data: { coverPhotoId: photoId } });
  await audit(user, photoId ? 'album_cover_pinned' : 'album_cover_unpinned', 'reunion_album', album.id, null, {
    name: album.name,
    photoId,
  });
  return Response.json({ ok: true, coverPhotoId: photoId });
}
