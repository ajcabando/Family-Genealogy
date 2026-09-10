import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const events = await prisma.reunionEvent.findMany({
    include: {
      coverPhoto: { select: { thumbPath: true, optimizedPath: true } },
      albums: { include: { _count: { select: { photos: true } } } },
    },
    orderBy: { date: 'desc' },
  });

  const counts = await prisma.albumPhoto.groupBy({ by: ['albumId'], _count: { photoId: true } });
  const countByAlbum = new Map(counts.map((c) => [c.albumId, c._count.photoId]));

  return Response.json({
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      location: e.location,
      description: e.description,
      coverThumb: e.coverPhoto?.thumbPath ?? null,
      coverOptimized: e.coverPhoto?.optimizedPath ?? null,
      albumCount: e.albums.length,
      photoCount: e.albums.reduce((sum, a) => sum + (countByAlbum.get(a.id) || 0), 0),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { name?: string; date?: string; location?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!body.name || !body.date) return Response.json({ error: 'Name and date are required' }, { status: 400 });
  const date = new Date(body.date);
  if (Number.isNaN(date.getTime())) return Response.json({ error: 'Invalid date' }, { status: 400 });

  const event = await prisma.reunionEvent.create({
    data: {
      name: body.name,
      date,
      location: body.location || null,
      description: body.description || null,
      createdById: user.id,
    },
  });
  await audit(user, 'reunion_created', 'reunion_event', event.id, null, { name: event.name, date: event.date.toISOString() });

  // Notify all active members
  const activeUsers = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
  await prisma.notification.createMany({
    data: activeUsers.map((u) => ({
      userId: u.id,
      type: 'NEW_REUNION',
      title: 'New reunion announced',
      body: `${event.name} on ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
      link: `/reunions/${event.id}`,
    })),
  });

  return Response.json({ id: event.id });
}