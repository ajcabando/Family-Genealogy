import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import Busboy from 'busboy';
import { prisma } from '@/lib/db';
import { apiAuth, readJson } from '@/lib/api-helpers';
import { getSettingBool } from '@/lib/settings';
import { storeImage } from '@/lib/files';
import { PHOTO_INCLUDE, serializePhoto } from '@/lib/photo-shared';

export async function GET(req: NextRequest) {
  // The photo archive is public — only approved photos are listed for anonymous
  // visitors. Pending/private scopes still require a session (admin for 'all').
  const auth = await apiAuth(req, { publicGet: true });
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(60, Math.max(1, Number(searchParams.get('limit')) || 24));
  const albumId = searchParams.get('albumId') || undefined;
  const personId = searchParams.get('personId') || undefined;
  const favorite = searchParams.get('favorite') === '1';
  const location = searchParams.get('location') || undefined;
  const sort = searchParams.get('sort') || 'newest';
  const q = searchParams.get('q') || undefined;
  const scope = searchParams.get('scope') || 'approved';
  const isAdmin = auth.user?.role === 'ADMIN';
  const memberId = auth.user?.memberId || null;

  let approvalStatus: string | undefined;
  if (scope === 'pending') {
    if (!isAdmin && !memberId) return Response.json({ photos: [], total: 0, hasMore: false });
    approvalStatus = 'PENDING';
  } else if (scope === 'all') {
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    approvalStatus = 'APPROVED';
  }

  const where: Record<string, unknown> = { deletedAt: null, ...(approvalStatus ? { approvalStatus } : {}) };
  if (albumId) where.albums = { some: { albumId } };
  if (personId) where.tags = { some: { memberId: personId } };
  if (favorite) where.favorite = true;
  if (location) where.location = location;
  if (q) where.caption = { contains: q, mode: 'insensitive' };
  if (scope === 'pending' && !isAdmin) where.uploadedById = memberId;

  const orderBy = sort === 'oldest' ? { createdAt: 'asc' as const } : { createdAt: 'desc' as const };

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({ where, include: PHOTO_INCLUDE, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.photo.count({ where }),
  ]);

  return Response.json({ photos: photos.map(serializePhoto), total, hasMore: page * limit < total });
}

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const approvalRequired = await getSettingBool('photoApprovalRequired');
  const status = approvalRequired ? 'PENDING' : 'APPROVED';

  const contentType = req.headers.get('content-type') || '';
  const busboy = Busboy({ headers: { 'content-type': contentType }, limits: { fileSize: 25 * 1024 * 1024, files: 20 } });

  const fields: Record<string, string> = {};
  const files: Buffer[] = [];
  let uploadError = '';

  await new Promise<void>((resolve) => {
    busboy.on('field', (name, val) => {
      fields[name] = val;
    });
    busboy.on('file', (_name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('error', () => {
        uploadError = 'File upload failed';
      });
      stream.on('limit', () => {
        uploadError = 'File too large (max 25MB)';
      });
      stream.on('end', () => {
        if (!info.mimeType.startsWith('image/')) {
          uploadError = `Unsupported file type: ${info.mimeType}`;
          return;
        }
        files.push(Buffer.concat(chunks));
      });
    });
    busboy.on('close', () => resolve());
    busboy.on('error', () => {
      uploadError = 'Upload failed';
      resolve();
    });
    Readable.fromWeb(req.body as never).pipe(busboy);
  });

  if (uploadError) return Response.json({ error: uploadError }, { status: 400 });
  if (files.length === 0) return Response.json({ error: 'No images provided' }, { status: 400 });

  const body = readJson(fields);
  const caption = String(body.caption || '') || null;
  const photoDate = body.photoDate ? new Date(String(body.photoDate)) : null;
  const location = String(body.location || '') || null;
  const photographer = String(body.photographer || '') || null;
  const tagIds: string[] = JSON.parse(String(body.tags || '[]')) || [];
  const albumId = String(body.albumId || '') || undefined;
  const profileFor = String(body.profileFor || '') || undefined;

  if (profileFor && user.role !== 'ADMIN' && profileFor !== user.memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (profileFor) {
    const target = await prisma.familyMember.findUnique({ where: { id: profileFor } });
    if (!target || target.deletedAt) return Response.json({ error: 'Family member not found' }, { status: 400 });
  }

  const memberId = user.memberId || null;
  const created: Array<{ id: string }> = [];

  for (const buffer of files) {
    let img;
    try {
      img = await storeImage(buffer);
    } catch {
      return Response.json({ error: 'Could not process one of the images' }, { status: 400 });
    }
    const photo = await prisma.photo.create({
      data: {
        ...img,
        caption,
        photoDate,
        location,
        photographer,
        uploadedById: memberId,
        // Profile photos are personal and low-risk — they publish immediately
        approvalStatus: profileFor ? 'APPROVED' : (status as 'PENDING' | 'APPROVED'),
      },
    });
    created.push({ id: photo.id });

    if (profileFor) {
      await prisma.familyMember.update({ where: { id: profileFor }, data: { profilePhotoId: photo.id } });
    }

    if (tagIds.length) {
      await prisma.photoTag.createMany({
        data: tagIds.map((memberIdTag) => ({ photoId: photo.id, memberId: memberIdTag, taggedById: memberId })),
        skipDuplicates: true,
      });
    }
    if (albumId) {
      await prisma.albumPhoto.create({ data: { albumId, photoId: photo.id, addedById: memberId } });
    }
    if (status === 'APPROVED') {
      await notifyTagged(photo.id, tagIds);
    }
  }

  return Response.json({ ok: true, photos: created, approvalStatus: status });
}

async function notifyTagged(photoId: string, memberIds: string[]) {
  if (!memberIds.length) return;
  const users = await prisma.user.findMany({
    where: { familyMemberId: { in: memberIds }, status: 'ACTIVE' },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: 'TAG',
      title: 'You were tagged in a photo',
      body: 'Someone tagged you in a family photo.',
      link: `/photos?photo=${photoId}`,
    })),
  });
}