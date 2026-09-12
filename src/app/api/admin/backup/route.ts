import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;

  const [members, relationships, photos, photoTags, reunionEvents, reunionAlbums, albumPhotos, users, changeRequests, auditLogs, familyEvents, settings] =
    await Promise.all([
      prisma.familyMember.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.relationship.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.photo.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.photoTag.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.reunionEvent.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.reunionAlbum.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.albumPhoto.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.changeRequest.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.familyEvent.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.setting.findMany(),
    ]);

  const backup = {
    app: 'family-archive',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { members, relationships, photos, photoTags, reunionEvents, reunionAlbums, albumPhotos, users, changeRequests, auditLogs, familyEvents, settings },
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="family-archive-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}