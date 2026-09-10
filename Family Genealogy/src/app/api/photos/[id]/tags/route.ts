import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  let body: { memberIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const memberIds = (body.memberIds || []).filter(Boolean);
  if (!memberIds.length) return Response.json({ error: 'No members provided' }, { status: 400 });

  await prisma.photoTag.createMany({
    data: memberIds.map((memberId) => ({ photoId: photo.id, memberId, taggedById: auth.user.memberId })),
    skipDuplicates: true,
  });

  // Notify new tagged members immediately when the photo is already published
  if (photo.approvalStatus === 'APPROVED') {
    const users = await prisma.user.findMany({
      where: { familyMemberId: { in: memberIds }, status: 'ACTIVE' },
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

  const tags = await prisma.photoTag.findMany({
    where: { photoId: photo.id },
    include: { member: { select: { id: true, firstName: true, lastName: true } } },
  });
  return Response.json({ tags: tags.map((t) => ({ id: t.id, memberId: t.memberId, name: `${t.member.firstName} ${t.member.lastName}` })) });
}