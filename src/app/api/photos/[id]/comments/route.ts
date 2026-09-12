import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { publicGet: true });
  if (auth instanceof Response) return auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  const comments = await prisma.photoComment.findMany({
    where: { photoId: photo.id },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json({
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorId: c.authorId,
      authorName: `${c.author.firstName} ${c.author.lastName}`,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const text = (body.body || '').trim();
  if (!text) return Response.json({ error: 'Comment body required' }, { status: 400 });
  if (text.length > 2000) return Response.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });

  if (!auth.user.memberId) {
    return Response.json({ error: 'You must be linked to a family member to comment' }, { status: 400 });
  }

  const comment = await prisma.photoComment.create({
    data: {
      photoId: photo.id,
      authorId: auth.user.memberId,
      body: text,
    },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  });

  // Notify the photo uploader (if not the commenter)
  if (photo.uploadedById && photo.uploadedById !== auth.user.memberId) {
    const uploaderUser = await prisma.user.findFirst({
      where: { familyMemberId: photo.uploadedById, status: 'ACTIVE' },
      select: { id: true },
    });
    if (uploaderUser) {
      await prisma.notification.create({
        data: {
          userId: uploaderUser.id,
          type: 'COMMENT',
          title: 'New comment on your photo',
          body: `${comment.author.firstName} commented on "${photo.caption || 'a family photo'}"`,
          link: `/photos?photo=${photo.id}`,
        },
      });
    }
  }

  // Notify tagged members who have active accounts (if not the commenter)
  const taggedMembers = await prisma.photoTag.findMany({
    where: { photoId: photo.id, memberId: { not: auth.user.memberId } },
    select: { memberId: true },
  });
  const taggedMemberIds = taggedMembers.map((t) => t.memberId);
  if (taggedMemberIds.length > 0) {
    const taggedUsers = await prisma.user.findMany({
      where: { familyMemberId: { in: taggedMemberIds }, status: 'ACTIVE' },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: taggedUsers.map((u) => ({
        userId: u.id,
        type: 'COMMENT',
        title: 'New comment on a photo you\'re tagged in',
        body: `${comment.author.firstName} commented on "${photo.caption || 'a family photo'}"`,
        link: `/photos?photo=${photo.id}`,
      })),
    });
  }

  return Response.json({
    comment: {
      id: comment.id,
      body: comment.body,
      authorId: comment.authorId,
      authorName: `${comment.author.firstName} ${comment.author.lastName}`,
      createdAt: comment.createdAt.toISOString(),
    },
  });
}
