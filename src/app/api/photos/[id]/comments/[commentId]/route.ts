import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function DELETE(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  const comment = await prisma.photoComment.findUnique({ where: { id: params.commentId } });
  if (!comment || comment.photoId !== photo.id) {
    return Response.json({ error: 'Comment not found' }, { status: 404 });
  }

  // Only the comment author or an admin can delete
  const isAdmin = auth.user.role === 'ADMIN';
  const isAuthor = comment.authorId === auth.user.memberId;
  if (!isAdmin && !isAuthor) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.photoComment.delete({ where: { id: comment.id } });

  return Response.json({ ok: true });
}
