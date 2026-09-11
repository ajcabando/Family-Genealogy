import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';
import { validateParentChild, validateSpouse } from '@/lib/validation';
import { normalizeProfileUpdate } from '@/lib/change-request-fields';

const PARENT_KIND: Record<string, string> = {
  PARENT: 'PARENT',
  ADOPTED_PARENT: 'ADOPTED_PARENT',
  STEP_PARENT: 'STEP_PARENT',
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { action?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const action = body.action;
  if (!['approve', 'reject', 'needs_info'].includes(action || '')) {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const request = await prisma.changeRequest.findUnique({ where: { id: params.id } });
  if (!request || request.status !== 'PENDING') {
    return Response.json({ error: 'Request not found or already reviewed' }, { status: 404 });
  }

  const proposed = (request.proposedData || {}) as Record<string, unknown>;

  if (action === 'approve') {
    const validationError = await applyChange(request.requestType, request.targetType, request.targetId, proposed);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    await audit(user, 'request_approved', 'change_request', request.id, request.oldData as never, proposed as never);
  } else if (action === 'reject') {
    await audit(user, 'request_rejected', 'change_request', request.id, request.oldData as never, proposed as never);
  } else {
    await audit(user, 'request_clarified', 'change_request', request.id, null, { notes: body.notes });
  }

  const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'NEEDS_INFO';
  await prisma.changeRequest.update({
    where: { id: request.id },
    data: { status, reviewedById: user.id, reviewedAt: new Date(), reviewNotes: body.notes || null },
  });

  // Notify the submitter
  const submitter = await prisma.user.findUnique({ where: { id: request.submittedById } });
  if (submitter) {
    await prisma.notification.create({
      data: {
        userId: submitter.id,
        type: 'APPROVAL_RESULT',
        title:
          action === 'approve'
            ? 'Your contribution was approved'
            : action === 'reject'
              ? 'Your contribution was not approved'
              : 'More information needed on your contribution',
        body: body.notes || (action === 'approve' ? 'It has been added to the official family tree.' : 'Please review the notes and resubmit.'),
        link: '/contributions',
      },
    });
  }

  return Response.json({ ok: true });
}

async function applyChange(requestType: string, targetType: string, targetId: string | null, p: Record<string, unknown>): Promise<string | null> {
  if (requestType === 'NEW_MEMBER') {
    const data: Record<string, unknown> = {};
    for (const f of ['firstName', 'middleName', 'lastName', 'maidenName', 'nickname', 'gender', 'birthDate', 'deathDate', 'birthPlace', 'deathPlace', 'biography', 'occupation', 'location', 'branch']) {
      if (p[f] !== undefined && p[f] !== '') data[f] = p[f];
    }
    if (data.birthDate) data.birthDate = new Date(String(data.birthDate));
    if (data.deathDate) data.deathDate = new Date(String(data.deathDate));
    await prisma.familyMember.create({ data: data as never });
    return null;
  }

  if (requestType === 'PROFILE_UPDATE') {
    if (!targetId) return 'Missing target member';
    const member = await prisma.familyMember.findUnique({ where: { id: targetId } });
    if (!member || member.deletedAt) return 'Target member not found';
    const { field, value: rawValue } = normalizeProfileUpdate(p);
    const allowed = ['firstName', 'middleName', 'lastName', 'maidenName', 'nickname', 'gender', 'birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'biography', 'occupation', 'location', 'branch'];
    if (!allowed.includes(field)) return 'Invalid field';
    let value: unknown = rawValue;
    if ((field === 'birthDate' || field === 'deathDate') && value) {
      value = new Date(String(value));
    }
    if (value === '' || value === null) value = null;
    await prisma.familyMember.update({ where: { id: targetId }, data: { [field]: value } });
    return null;
  }

  if (requestType === 'RELATIONSHIP') {
    const a = String(p.personAId);
    const b = String(p.personBId);
    const type = String(p.type);
    if (!a || !b || a === b) return 'Invalid relationship pair';
    let error: string | null = null;

    if (PARENT_KIND[type]) {
      // Direction: A is parent of B (or B is parent of A for CHILD-type requests)
      let parentId = a;
      let childId = b;
      let relType = PARENT_KIND[type];
      if (type === 'CHILD') {
        parentId = b;
        childId = a;
      }
      error = await validateParentChild(parentId, childId, relType as never);
      if (!error) {
        await prisma.relationship.create({ data: { personId: parentId, relatedPersonId: childId, type: relType as never } });
      }
    } else if (type === 'SPOUSE') {
      error = await validateSpouse(a, b);
      if (!error) {
        await prisma.relationship.create({ data: { personId: a, relatedPersonId: b, type: 'SPOUSE' } });
      }
    } else if (type === 'SIBLING') {
      const dup = await prisma.relationship.findFirst({
        where: { OR: [{ personId: a, relatedPersonId: b, type: 'SIBLING' }, { personId: b, relatedPersonId: a, type: 'SIBLING' }] },
      });
      if (dup) error = 'These two people are already listed as siblings.';
      else await prisma.relationship.create({ data: { personId: a, relatedPersonId: b, type: 'SIBLING' } });
    } else {
      return 'Unsupported relationship type';
    }
    return error;
  }

  return 'Unsupported request type';
}