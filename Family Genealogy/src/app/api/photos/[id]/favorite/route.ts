import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt || photo.approvalStatus !== 'APPROVED') {
    return Response.json({ error: 'Photo not found' }, { status: 404 });
  }

  const updated = await prisma.photo.update({ where: { id: photo.id }, data: { favorite: !photo.favorite } });
  return Response.json({ ok: true, favorite: updated.favorite });
}