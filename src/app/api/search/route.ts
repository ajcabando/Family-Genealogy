import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  // Public: anyone can search the family directory.
  const auth = await apiAuth(req, { publicGet: true });
  if (auth instanceof Response) return auth;

  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
  if (!q) return Response.json({ results: [] });

  const yearMatch = q.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  const members = await prisma.familyMember.findMany({
    where: { deletedAt: null },
    include: { profilePhoto: { select: { thumbPath: true } } },
    take: 2000,
  });

  const results = members
    .filter((m) => {
      const hay = [
        m.firstName, m.middleName, m.lastName, m.maidenName, m.nickname, m.branch,
      ].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(q)) return true;
      if (year != null) {
        const by = m.birthDate?.getFullYear();
        const dy = m.deathDate?.getFullYear();
        if (by === year || dy === year) return true;
      }
      return false;
    })
    .slice(0, 10)
    .map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      birthYear: m.birthDate ? m.birthDate.getFullYear() : null,
      deathYear: m.deathDate ? m.deathDate.getFullYear() : null,
      branch: m.branch,
      thumbPath: m.profilePhoto?.thumbPath ?? null,
    }));

  return Response.json({ results });
}