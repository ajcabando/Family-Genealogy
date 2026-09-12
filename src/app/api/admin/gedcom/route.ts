import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import Busboy from 'busboy';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';
import { serializeGedcom, parseGedcom, parseGedcomDate } from '@/lib/gedcom';
import { validateParentChild, validateSpouse } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;

  const [members, relationships] = await Promise.all([
    prisma.familyMember.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } }),
    prisma.relationship.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const gedcom = serializeGedcom(members, relationships);
  return new Response(gedcom, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="family-tree-${new Date().toISOString().slice(0, 10)}.ged"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const busboy = Busboy({ headers: { 'content-type': req.headers.get('content-type') || '' }, limits: { fileSize: 10 * 1024 * 1024 } });
  let text = '';
  let uploadError = '';

  await new Promise<void>((resolve) => {
    busboy.on('file', (_name, stream, info) => {
      if (!info.filename.toLowerCase().endsWith('.ged')) {
        uploadError = 'Please upload a .ged file';
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('limit', () => {
        uploadError = 'File too large (max 10MB)';
      });
      stream.on('end', () => {
        text = Buffer.concat(chunks).toString('utf-8');
      });
    });
    busboy.on('close', () => resolve());
    busboy.on('error', () => {
      uploadError = 'Upload failed';
      resolve();
    });
    Readable.fromWeb(req.body as never).pipe(busboy);
  });

  if (uploadError) return Response.json({ error: uploadError }, { status: 400 });
  if (!text.trim()) return Response.json({ error: 'No GEDCOM content received' }, { status: 400 });

  const { individuals, families } = parseGedcom(text);
  if (individuals.length === 0) return Response.json({ error: 'No individuals found in this GEDCOM file' }, { status: 400 });

  // Existing members for dedupe (same first + last name + birth year)
  const existing = await prisma.familyMember.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, birthDate: true } });
  const keyOf = (m: { firstName: string; lastName: string; birthDate?: Date | null }) => {
    const y = m.birthDate ? new Date(m.birthDate).getFullYear() : '';
    return `${(m.firstName || '').trim().toLowerCase()}|${(m.lastName || '').trim().toLowerCase()}|${y}`;
  };
  const byKey = new Map(existing.map((m) => [keyOf(m), m.id]));

  let created = 0;
  let reused = 0;
  let relCreated = 0;
  let relSkipped = 0;
  const idByXref = new Map<string, string>();

  for (const indi of individuals) {
    const firstName = indi.given?.split(' ')[0] || '';
    const middleName = indi.given?.split(' ').slice(1).join(' ') || null;
    const lastName = indi.surname || '';
    const birthDate = parseGedcomDate(indi.birthDate || '');
    const deathDate = parseGedcomDate(indi.deathDate || '');

    if (!firstName && !lastName) {
      reused++;
      continue;
    }

    const key = `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}|${birthDate ? birthDate.getFullYear() : ''}`;
    const match = byKey.get(key);
    if (match) {
      idByXref.set(indi.xref, match);
      reused++;
      continue;
    }

    const note = indi.note.trim();
    let biography: string | null = null;
    let branch: string | null = null;
    const branchMatch = note.match(/^Branch:\s*(.+)$/m);
    if (branchMatch) {
      branch = branchMatch[1].trim();
      biography = note.replace(/^Branch:\s*.+$/m, '').trim() || null;
    } else {
      biography = note || null;
    }

    const member = await prisma.familyMember.create({
      data: {
        firstName,
        middleName: middleName || null,
        lastName,
        gender: indi.sex === 'M' ? 'MALE' : indi.sex === 'F' ? 'FEMALE' : 'UNKNOWN',
        birthDate,
        birthPlace: indi.birthPlace || null,
        deathDate,
        deathPlace: indi.deathPlace || null,
        occupation: indi.occupation || null,
        biography,
        branch,
        createdById: user.id,
      },
    });
    idByXref.set(indi.xref, member.id);
    created++;
  }

  // Relationships via families
  for (const fam of families) {
    const husbandId = fam.husband ? idByXref.get(fam.husband) : undefined;
    const wifeId = fam.wife ? idByXref.get(fam.wife) : undefined;

    if (husbandId && wifeId) {
      const err = await validateSpouse(husbandId, wifeId);
      if (!err) {
        await prisma.relationship.create({
          data: {
            personId: husbandId,
            relatedPersonId: wifeId,
            type: 'SPOUSE',
            startDate: parseGedcomDate(fam.married || '') || undefined,
            addedById: user.id,
          },
        });
        relCreated++;
      } else {
        relSkipped++;
      }
    }

    const parents = [husbandId, wifeId].filter(Boolean) as string[];
    for (const childXref of fam.children) {
      const childId = idByXref.get(childXref);
      if (!childId) continue;
      for (const parentId of parents) {
        const err = await validateParentChild(parentId, childId, 'PARENT');
        if (!err) {
          await prisma.relationship.create({ data: { personId: parentId, relatedPersonId: childId, type: 'PARENT', addedById: user.id } });
          relCreated++;
        } else {
          relSkipped++;
        }
      }
    }
  }

  await audit(user, 'gedcom_imported', 'gedcom', undefined, null, {
    individuals: individuals.length,
    created,
    reused,
    relationships: relCreated,
    skipped: relSkipped,
  });

  return Response.json({
    ok: true,
    summary: {
      total: individuals.length,
      created,
      reused,
      relationships: relCreated,
      skipped: relSkipped,
    },
  });
}