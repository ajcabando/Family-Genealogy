import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { getSettingBool } from '@/lib/settings';

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const contributionsEnabled = await getSettingBool('contributionApprovalRequired');
  if (!contributionsEnabled && user.role !== 'ADMIN') {
    return Response.json({ error: 'Contributions are currently disabled' }, { status: 403 });
  }

  let body: { requestType?: string; targetType?: string; targetId?: string; proposedData?: Record<string, unknown>; reason?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const requestType = body.requestType;
  const proposed = body.proposedData || {};
  if (!['NEW_MEMBER', 'RELATIONSHIP', 'PROFILE_UPDATE'].includes(requestType || '')) {
    return Response.json({ error: 'Invalid request type' }, { status: 400 });
  }
  if (!body.reason || !String(body.reason).trim()) {
    return Response.json({ error: 'A reason is required' }, { status: 400 });
  }
  if (requestType === 'NEW_MEMBER' && (!proposed.firstName || !proposed.lastName)) {
    return Response.json({ error: 'First and last name are required' }, { status: 400 });
  }
  if (requestType === 'PROFILE_UPDATE' && (!body.targetId || !proposed.field)) {
    return Response.json({ error: 'Select a member and a field to update' }, { status: 400 });
  }
  if (requestType === 'RELATIONSHIP' && (!proposed.personAId || !proposed.personBId || !proposed.type)) {
    return Response.json({ error: 'Relationship details are incomplete' }, { status: 400 });
  }

  // Snapshot current value for profile updates (shown to the reviewer)
  let oldData: unknown = null;
  if (requestType === 'PROFILE_UPDATE' && body.targetId) {
    const member = await prisma.familyMember.findUnique({ where: { id: body.targetId } });
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
    const field = String(proposed.field);
    const val = (member as Record<string, unknown>)[field];
    oldData = { [field]: val instanceof Date ? val.toISOString() : (val ?? null) };
  }

  const request = await prisma.changeRequest.create({
    data: {
      requestType: requestType as never,
      targetType: body.targetType || 'new_member',
      targetId: body.targetId || null,
      submittedById: user.id,
      oldData: oldData as never,
      proposedData: proposed as never,
      reason: String(body.reason).trim(),
      status: 'PENDING',
    },
  });

  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: 'REQUEST',
      title: `New ${(requestType || 'change').toLowerCase().replace(/_/g, ' ')} request`,
      body: `${user.name || user.email} submitted a change for your review.`,
      link: '/admin/approvals',
    })),
  });

  return Response.json({ id: request.id });
}