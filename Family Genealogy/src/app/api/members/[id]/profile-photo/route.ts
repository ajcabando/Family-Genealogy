import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const isSelf = user.memberId === params.id;
  if (user.role !== 'ADMIN' && !isSelf) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const member = await prisma.familyMember.findUnique({ where: { id: params.id } });
  if (!member || member.deletedAt) return Response.json({ error: 'Member not found' }, { status: 404 });

  let body: { photoId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!body.photoId) return Response.json({ error: 'photoId is required' }, { status: 400 });

  const photo = await prisma.photo.findUnique({ where: { id: body.photoId } });
  if (!photo || photo.deletedAt || photo.approvalStatus !== 'APPROVED') {
    return Response.json({ error: 'Photo not found or not yet approved' }, { status: 400 });
  }

  await prisma.familyMember.update({ where: { id: member.id }, data: { profilePhotoId: photo.id } });
  if (user.role === 'ADMIN') {
    await audit(user, 'profile_photo_set', 'family_member', member.id, null, { photoId: photo.id });
  }
  return Response.json({ ok: true });
}