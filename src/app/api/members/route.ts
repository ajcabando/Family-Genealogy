import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { validateMemberFields } from '@/lib/validation';
import { audit } from '@/lib/audit';

const FIELDS = ['firstName', 'middleName', 'lastName', 'maidenName', 'nickname', 'gender', 'birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'biography', 'occupation', 'location', 'branch'];

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const errors = validateMemberFields(body);
  if (errors) return Response.json({ error: Object.values(errors)[0], errors }, { status: 400 });

  const data: Record<string, unknown> = { createdById: user.id };
  for (const f of FIELDS) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (data.birthDate) data.birthDate = new Date(String(data.birthDate));
  if (data.deathDate) data.deathDate = new Date(String(data.deathDate));

  const member = await prisma.familyMember.create({ data: data as never });
  await audit(user, 'member_created', 'family_member', member.id, null, { name: `${member.firstName} ${member.lastName}` });
  return Response.json({ id: member.id });
}