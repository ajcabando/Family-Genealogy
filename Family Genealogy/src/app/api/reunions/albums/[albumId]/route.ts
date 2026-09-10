import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function DELETE(req: NextRequest, { params }: { params: { albumId: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const album = await prisma.reunionAlbum.findUnique({ where: { id: params.albumId } });
  if (!album) return Response.json({ error: 'Album not found' }, { status: 404 });

  await prisma.reunionAlbum.delete({ where: { id: album.id } });
  await audit(user, 'album_deleted', 'reunion_album', album.id, null, { name: album.name });
  return Response.json({ ok: true });
}