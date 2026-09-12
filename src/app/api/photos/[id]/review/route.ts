import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { action?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const action = body.action;
  if (!['approve', 'reject'].includes(action || '')) return Response.json({ error: 'Invalid action' }, { status: 400 });

  const photo = await prisma.photo.findUnique({ where: { id: params.id }, include: { tags: true } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
  await prisma.photo.update({ where: { id: photo.id }, data: { approvalStatus: status } });

  await audit(user, action === 'approve' ? 'photo_approved' : 'photo_rejected', 'photo', photo.id, { status: photo.approvalStatus }, { status, notes: body.notes });

  // Notify the uploader
  const uploaderUser = photo.uploadedById
    ? await prisma.user.findFirst({ where: { familyMemberId: photo.uploadedById, status: 'ACTIVE' }, select: { id: true } })
    : null;
  if (uploaderUser) {
    await prisma.notification.create({
      data: {
        userId: uploaderUser.id,
        type: 'PHOTO_APPROVAL',
        title: action === 'approve' ? 'Your photo was approved' : 'Your photo was not approved',
        body: action === 'approve' ? 'It is now published in the family archive.' : body.notes || 'Please review the photo and try again.',
        link: `/photos?photo=${photo.id}`,
      },
    });
  }

  // On approval, notify everyone newly tagged
  if (action === 'approve' && photo.tags.length) {
    const users = await prisma.user.findMany({
      where: { familyMemberId: { in: photo.tags.map((t) => t.memberId) }, status: 'ACTIVE' },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: 'TAG',
        title: 'You were tagged in a photo',
        body: photo.caption || 'A family photo featuring you was published.',
        link: `/photos?photo=${photo.id}`,
      })),
    });
  }

  return Response.json({ ok: true });
}