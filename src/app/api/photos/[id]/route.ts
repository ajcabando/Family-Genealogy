import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  const isOwner = photo.uploadedById && photo.uploadedById === user.memberId;
  if (user.role !== 'ADMIN' && !isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.caption !== undefined) data.caption = String(body.caption) || null;
  if (body.description !== undefined) data.description = String(body.description) || null;
  if (body.location !== undefined) data.location = String(body.location) || null;
  if (body.photographer !== undefined) data.photographer = String(body.photographer) || null;
  if (body.photoDate !== undefined) data.photoDate = body.photoDate ? new Date(String(body.photoDate)) : null;

  if (Object.keys(data).length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  const updated = await prisma.photo.update({ where: { id: photo.id }, data });
  if (user.role === 'ADMIN') {
    await audit(user, 'photo_updated', 'photo', photo.id, { caption: photo.caption }, { caption: updated.caption });
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  const isOwner = photo.uploadedById && photo.uploadedById === user.memberId;
  if (user.role !== 'ADMIN' && !isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.photo.update({ where: { id: photo.id }, data: { deletedAt: new Date() } });
  if (user.role === 'ADMIN') await audit(user, 'photo_deleted', 'photo', photo.id);
  return Response.json({ ok: true });
}