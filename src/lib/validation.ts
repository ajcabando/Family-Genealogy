import { prisma } from './db';
import type { RelationshipType } from '@prisma/client';

type ErrorMap = { [field: string]: string } | null;

/**
 * Validate a proposed parent/child link. Returns error message or null.
 * Rules: no self-parent, no duplicate rows, no cycles, spouse and parent
 * relationships are mutually exclusive for the same pair.
 */
export async function validateParentChild(
  parentId: string,
  childId: string,
  type: RelationshipType,
  existingId?: string,
): Promise<string | null> {
  if (parentId === childId) return 'A person cannot be their own parent.';

  const dup = await prisma.relationship.findFirst({
    where: {
      personId: parentId,
      relatedPersonId: childId,
      type,
      ...(existingId ? { id: { not: existingId } } : {}),
    },
  });
  if (dup) return 'This parent-child relationship already exists.';

  // Prevent cycles: walking down from child must never reach parent.
  let frontier = [childId];
  const seen = new Set<string>(frontier);
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      const rows = await prisma.relationship.findMany({
        where: { personId: id, type: { in: ['PARENT', 'ADOPTED_PARENT', 'STEP_PARENT'] as RelationshipType[] } },
        select: { relatedPersonId: true },
      });
      for (const r of rows) {
        if (r.relatedPersonId === parentId) return 'This would create a circular family relationship.';
        if (!seen.has(r.relatedPersonId)) {
          seen.add(r.relatedPersonId);
          next.push(r.relatedPersonId);
        }
      }
    }
    frontier = next;
  }

  // Parent of X cannot also be X's spouse (and vice versa).
  const spouseCheck = await prisma.relationship.findFirst({
    where: {
      OR: [
        { personId: parentId, relatedPersonId: childId, type: 'SPOUSE' },
        { personId: childId, relatedPersonId: parentId, type: 'SPOUSE' },
      ],
    },
  });
  if (spouseCheck) return 'A spouse relationship already exists between these two people.';
  return null;
}

export async function validateSpouse(aId: string, bId: string, existingId?: string): Promise<string | null> {
  if (aId === bId) return 'A person cannot be their own spouse.';

  const dup = await prisma.relationship.findFirst({
    where: {
      OR: [
        { personId: aId, relatedPersonId: bId, type: 'SPOUSE' },
        { personId: bId, relatedPersonId: aId, type: 'SPOUSE' },
      ],
      ...(existingId ? { id: { not: existingId } } : {}),
    },
  });
  if (dup) return 'These two people are already listed as spouses.';

  const parentCheck = await prisma.relationship.findFirst({
    where: {
      OR: [
        { personId: aId, relatedPersonId: bId, type: { in: ['PARENT', 'ADOPTED_PARENT', 'STEP_PARENT'] } },
        { personId: bId, relatedPersonId: aId, type: { in: ['PARENT', 'ADOPTED_PARENT', 'STEP_PARENT'] } },
      ],
    },
  });
  if (parentCheck) return 'A parent-child relationship already exists between these two people.';
  return null;
}

export async function validateSibling(aId: string, bId: string, existingId?: string): Promise<string | null> {
  if (aId === bId) return 'A person cannot be their own sibling.';
  const dup = await prisma.relationship.findFirst({
    where: {
      OR: [
        { personId: aId, relatedPersonId: bId, type: 'SIBLING' },
        { personId: bId, relatedPersonId: aId, type: 'SIBLING' },
      ],
      ...(existingId ? { id: { not: existingId } } : {}),
    },
  });
  return dup ? 'These two people are already listed as siblings.' : null;
}

export function validateMemberFields(body: Record<string, unknown>): ErrorMap {
  const errors: ErrorMap = {};
  if (!body.firstName || typeof body.firstName !== 'string' || !body.firstName.trim()) {
    errors.firstName = 'First name is required';
  }
  if (!body.lastName || typeof body.lastName !== 'string' || !body.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }
  if (body.gender && !['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].includes(body.gender as string)) {
    errors.gender = 'Invalid gender';
  }
  if (body.birthDate && Number.isNaN(new Date(body.birthDate as string).getTime())) {
    errors.birthDate = 'Invalid birth date';
  }
  if (body.deathDate && Number.isNaN(new Date(body.deathDate as string).getTime())) {
    errors.deathDate = 'Invalid death date';
  }
  return errors && Object.keys(errors).length ? errors : null;
}