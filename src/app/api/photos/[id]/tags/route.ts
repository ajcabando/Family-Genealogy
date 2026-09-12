import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

type IncomingTag = { memberId?: string; x?: number | null; y?: number | null };

/** Clamp a percentage into 0-100, rounded to 2 decimals. Returns null when absent. */
function clampPct(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  let body: { memberIds?: string[]; tags?: IncomingTag[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Accept either a plain member list (legacy) or placed tags with coordinates.
  const incoming: IncomingTag[] = Array.isArray(body.tags)
    ? body.tags
    : (body.memberIds || []).map((memberId) => ({ memberId }));
  const cleaned = incoming
    .filter((t): t is IncomingTag & { memberId: string } => typeof t.memberId === 'string' && !!t.memberId)
    .slice(0, 100);
  if (!cleaned.length) return Response.json({ error: 'No members provided' }, { status: 400 });

  const memberIds = [...new Set(cleaned.map((t) => t.memberId))];
  const existing = await prisma.photoTag.findMany({
    where: { photoId: photo.id, memberId: { in: memberIds } },
    select: { memberId: true },
  });
  const alreadyTagged = new Set(existing.map((t) => t.memberId));

  // Upsert so an existing tag can be repositioned without a separate endpoint.
  for (const t of cleaned) {
    const x = clampPct(t.x);
    const y = clampPct(t.y);
    await prisma.photoTag.upsert({
      where: { photoId_memberId: { photoId: photo.id, memberId: t.memberId } },
      update: { ...(x !== null ? { xPosition: x } : {}), ...(y !== null ? { yPosition: y } : {}) },
      create: { photoId: photo.id, memberId: t.memberId, taggedById: auth.user.memberId, xPosition: x, yPosition: y },
    });
  }

  // Notify newly tagged members immediately when the photo is already published
  const newlyTagged = memberIds.filter((id) => !alreadyTagged.has(id));
  if (newlyTagged.length && photo.approvalStatus === 'APPROVED') {
    const users = await prisma.user.findMany({
      where: { familyMemberId: { in: newlyTagged }, status: 'ACTIVE' },
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

  return Response.json({ tags: await listTags(photo.id) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo || photo.deletedAt) return Response.json({ error: 'Photo not found' }, { status: 404 });

  let body: { memberId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!body.memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  const tag = await prisma.photoTag.findUnique({
    where: { photoId_memberId: { photoId: photo.id, memberId: body.memberId } },
  });
  if (!tag) return Response.json({ error: 'Tag not found' }, { status: 404 });

  // Only the original tagger or an admin can remove tags
  const isAdmin = auth.user.role === 'ADMIN';
  const isTagger = tag.taggedById === auth.user.memberId;
  if (!isAdmin && !isTagger) return Response.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.photoTag.delete({ where: { id: tag.id } });

  return Response.json({ tags: await listTags(photo.id) });
}

async function listTags(photoId: string) {
  const tags = await prisma.photoTag.findMany({
    where: { photoId },
    include: { member: { select: { id: true, firstName: true, lastName: true } } },
  });
  return tags.map((t) => ({
    id: t.id,
    memberId: t.memberId,
    name: `${t.member.firstName} ${t.member.lastName}`,
    x: t.xPosition,
    y: t.yPosition,
  }));
}
