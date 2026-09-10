import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { validateMemberFields } from '@/lib/validation';
import { audit } from '@/lib/audit';

const FIELDS = ['firstName', 'middleName', 'lastName', 'maidenName', 'nickname', 'gender', 'birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'biography', 'occupation', 'location', 'branch'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const existing = await prisma.familyMember.findUnique({ where: { id: params.id } });
  if (!existing) return Response.json({ error: 'Member not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const errors = validateMemberFields(body);
  if (errors) return Response.json({ error: Object.values(errors)[0], errors }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (data.birthDate) data.birthDate = new Date(String(data.birthDate));
  if (data.deathDate) data.deathDate = new Date(String(data.deathDate));

  const updated = await prisma.familyMember.update({ where: { id: existing.id }, data: data as never });
  await audit(user, 'member_updated', 'family_member', existing.id, { firstName: existing.firstName, lastName: existing.lastName }, { firstName: updated.firstName, lastName: updated.lastName });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const member = await prisma.familyMember.findUnique({ where: { id: params.id } });
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
  if (member.deletedAt) return Response.json({ error: 'Already deleted' }, { status: 400 });

  await prisma.familyMember.update({ where: { id: member.id }, data: { deletedAt: new Date() } });
  await audit(user, 'member_deleted', 'family_member', member.id, null, { name: `${member.firstName} ${member.lastName}` });
  return Response.json({ ok: true });
}