import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const event = await prisma.reunionEvent.findUnique({ where: { id: params.id } });
  if (!event) return Response.json({ error: 'Reunion not found' }, { status: 404 });

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!body.name) return Response.json({ error: 'Album name is required' }, { status: 400 });

  const album = await prisma.reunionAlbum.create({
    data: { reunionEventId: event.id, name: body.name, description: body.description || null },
  });
  await audit(user, 'album_created', 'reunion_album', album.id, null, { name: album.name, event: event.name });
  return Response.json({ id: album.id });
}