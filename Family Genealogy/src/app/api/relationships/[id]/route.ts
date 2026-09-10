import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const rel = await prisma.relationship.findUnique({ where: { id: params.id } });
  if (!rel) return Response.json({ error: 'Relationship not found' }, { status: 404 });

  await prisma.relationship.delete({ where: { id: rel.id } });
  await audit(user, 'relationship_removed', 'relationship', rel.id, { type: rel.type, personId: rel.personId, relatedPersonId: rel.relatedPersonId }, null);
  return Response.json({ ok: true });
}