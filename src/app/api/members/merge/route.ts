import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { keepId?: string; mergeId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { keepId, mergeId } = body;
  if (!keepId || !mergeId || keepId === mergeId) return Response.json({ error: 'Select two different members' }, { status: 400 });

  const [keep, drop] = await Promise.all([
    prisma.familyMember.findUnique({ where: { id: keepId } }),
    prisma.familyMember.findUnique({ where: { id: mergeId } }),
  ]);
  if (!keep || !drop) return Response.json({ error: 'Member not found' }, { status: 404 });

  // Move relationships: repoint drop -> keep (dedupe exact duplicates)
  await prisma.$transaction(async (tx) => {
    const rels = await tx.relationship.findMany({
      where: { OR: [{ personId: drop.id }, { relatedPersonId: drop.id }] },
    });
    for (const r of rels) {
      const personId = r.personId === drop.id ? keep.id : r.personId;
      const relatedPersonId = r.relatedPersonId === drop.id ? keep.id : r.relatedPersonId;
      if (personId === relatedPersonId) {
        await tx.relationship.delete({ where: { id: r.id } });
        continue;
      }
      const existing = await tx.relationship.findFirst({
        where: { personId, relatedPersonId, type: r.type },
      });
      if (existing) {
        await tx.relationship.delete({ where: { id: r.id } });
      } else {
        await tx.relationship.update({ where: { id: r.id }, data: { personId, relatedPersonId } });
      }
    }
    // Move photo tags
    await tx.photoTag.updateMany({ where: { memberId: drop.id }, data: { memberId: keep.id } });
    // Move uploads
    await tx.photo.updateMany({ where: { uploadedById: drop.id }, data: { uploadedById: keep.id } });
    // Move linked user + change requests targeting the dropped record
    await tx.user.updateMany({ where: { familyMemberId: drop.id }, data: { familyMemberId: keep.id } });
    await tx.changeRequest.updateMany({ where: { targetId: drop.id }, data: { targetId: keep.id } });
    // Fill missing profile fields on the kept record
    const fill: Record<string, unknown> = {};
    const fields = ['firstName', 'middleName', 'lastName', 'maidenName', 'nickname', 'gender', 'birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'biography', 'occupation', 'location', 'branch'] as const;
    for (const f of fields) {
      if (!keep[f] && drop[f]) fill[f] = drop[f];
    }
    if (Object.keys(fill).length) await tx.familyMember.update({ where: { id: keep.id }, data: fill as never });
    if (!keep.profilePhotoId && drop.profilePhotoId) {
      await tx.familyMember.update({ where: { id: keep.id }, data: { profilePhotoId: drop.profilePhotoId } });
    }
    // Soft-delete the dropped record (restorable)
    await tx.familyMember.update({ where: { id: drop.id }, data: { deletedAt: new Date() } });
  });

  await audit(user, 'members_merged', 'family_member', keep.id, { from: drop.id }, { keep: `${keep.firstName} ${keep.lastName}` });
  return Response.json({ ok: true });
}