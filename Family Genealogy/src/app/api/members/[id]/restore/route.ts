import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const member = await prisma.familyMember.findUnique({ where: { id: params.id } });
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  await prisma.familyMember.update({ where: { id: member.id }, data: { deletedAt: null } });
  await audit(user, 'member_restored', 'family_member', member.id, null, { name: `${member.firstName} ${member.lastName}` });
  return Response.json({ ok: true });
}