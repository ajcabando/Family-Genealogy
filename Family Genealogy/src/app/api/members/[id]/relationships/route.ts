import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { validateParentChild, validateSpouse, validateSibling } from '@/lib/validation';
import { audit } from '@/lib/audit';

const TYPES = ['PARENT', 'SPOUSE', 'SIBLING', 'ADOPTED_PARENT', 'ADOPTED_CHILD', 'STEP_PARENT', 'STEP_CHILD'];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { type?: string; otherId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const type = body.type as string;
  const otherId = body.otherId as string;
  const memberId = params.id;

  if (!TYPES.includes(type)) return Response.json({ error: 'Invalid relationship type' }, { status: 400 });
  if (!otherId || otherId === memberId) return Response.json({ error: 'Select a different family member' }, { status: 400 });

  const [member, other] = await Promise.all([
    prisma.familyMember.findUnique({ where: { id: memberId } }),
    prisma.familyMember.findUnique({ where: { id: otherId } }),
  ]);
  if (!member || !other || member.deletedAt || other.deletedAt) {
    return Response.json({ error: 'Member not found' }, { status: 404 });
  }

  // Normalize direction: for parent-like types the initiator is the parent.
  let personId = memberId;
  let relatedPersonId = otherId;
  let relType = type;
  if (type === 'ADOPTED_CHILD') {
    personId = otherId;
    relatedPersonId = memberId;
    relType = 'ADOPTED_PARENT';
  } else if (type === 'STEP_CHILD') {
    personId = otherId;
    relatedPersonId = memberId;
    relType = 'STEP_PARENT';
  }

  let error: string | null = null;
  if (relType === 'PARENT' || relType === 'ADOPTED_PARENT' || relType === 'STEP_PARENT') {
    error = await validateParentChild(personId, relatedPersonId, relType as never);
  } else if (relType === 'SPOUSE') {
    error = await validateSpouse(personId, relatedPersonId);
  } else if (relType === 'SIBLING') {
    error = await validateSibling(personId, relatedPersonId);
  }
  if (error) return Response.json({ error }, { status: 400 });

  const rel = await prisma.relationship.create({ data: { personId, relatedPersonId, type: relType as never, addedById: user.id } });
  await audit(user, 'relationship_added', 'relationship', rel.id, null, { type: relType, personId, relatedPersonId });
  return Response.json({ id: rel.id });
}