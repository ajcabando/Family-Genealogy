// Minimal GEDCOM 5.5.1 support: export the family tree and import .ged files.

export type GedcomPerson = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  maidenName?: string | null;
  nickname?: string | null;
  gender?: string | null;
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
  deathPlace?: string | null;
  occupation?: string | null;
  biography?: string | null;
  branch?: string | null;
};

export type GedcomRel = {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: string;
  startDate?: Date | null;
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function gedcomDate(d?: Date | null): string {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function parseGedcomDate(value: string): Date | null {
  if (!value) return null;
  // Strip qualifiers like ABT / BEF / AFT / EST / CAL
  const cleaned = value.replace(/^(ABT|BEF|AFT|EST|CAL|FROM|TO|BET)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const mon = MONTHS.indexOf(parts[1].toUpperCase());
    const year = Number(parts[2]);
    if (!Number.isNaN(day) && mon >= 0 && !Number.isNaN(year) && year > 0) return new Date(year, mon, day);
  } else if (parts.length === 2) {
    const mon = MONTHS.indexOf(parts[0].toUpperCase());
    const year = Number(parts[1]);
    if (mon >= 0 && !Number.isNaN(year) && year > 0) return new Date(year, mon, 1);
  } else if (parts.length === 1) {
    const year = Number(parts[0]);
    if (!Number.isNaN(year) && year > 0) return new Date(year, 0, 1);
  }
  const iso = new Date(cleaned);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function serializeGedcom(members: GedcomPerson[], relationships: GedcomRel[]): string {
  const lines: string[] = ['0 HEAD', '1 SOUR Family Archive', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8'];
  const byId = new Map(members.map((m) => [m.id, m]));

  // Build families: group children by their set of parents
  type Family = { id: string; husband?: string; wife?: string; children: string[]; married?: Date | null };
  const families: Family[] = [];
  const familyOfChild = new Map<string, string>(); // child -> family id
  const spouseFamilies = new Map<string, string>(); // "a|b" sorted -> family id

  const childrenOf = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === 'PARENT' || r.type === 'ADOPTED_PARENT' || r.type === 'STEP_PARENT') {
      const arr = childrenOf.get(r.personId) || [];
      arr.push(r.relatedPersonId);
      childrenOf.set(r.personId, arr);
    }
  }
  const spousesOf = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type !== 'SPOUSE') continue;
    const a = spousesOf.get(r.personId) || [];
    a.push(r.relatedPersonId);
    spousesOf.set(r.personId, a);
    const b = spousesOf.get(r.relatedPersonId) || [];
    b.push(r.personId);
    spousesOf.set(r.relatedPersonId, b);
  }
  const marriedDates = new Map<string, Date | null>();
  for (const r of relationships) {
    if (r.type === 'SPOUSE' && r.startDate) marriedDates.set(`${r.personId}|${r.relatedPersonId}`, r.startDate);
  }

  const ensureFamily = (parents: string[]): string => {
    const sorted = [...parents].sort();
    const key = sorted.join('|');
    if (spouseFamilies.has(key)) return spouseFamilies.get(key)!;
    const famId = `F${families.length + 1}`;
    const fam: Family = { id: famId, children: [] };
    if (sorted.length === 2) {
      const [p1, p2] = sorted;
      fam.husband = byId.get(p1)?.gender === 'FEMALE' ? p2 : p1;
      fam.wife = fam.husband === p1 ? p2 : p1;
      fam.married = marriedDates.get(`${p1}|${p2}`) || null;
    } else {
      fam.husband = sorted[0];
    }
    families.push(fam);
    spouseFamilies.set(key, famId);
    return famId;
  };

  for (const [parentId, kids] of childrenOf) {
    for (const childId of kids) {
      if (familyOfChild.has(childId)) continue;
      const parentsOfChild = relationships
        .filter((r) => ['PARENT', 'ADOPTED_PARENT', 'STEP_PARENT'].includes(r.type) && r.relatedPersonId === childId)
        .map((r) => r.personId);
      const famId = ensureFamily(parentsOfChild);
      const fam = families.find((f) => f.id === famId)!;
      if (!fam.children.includes(childId)) fam.children.push(childId);
      familyOfChild.set(childId, famId);
    }
  }
  // Spouse pairs without children still get a FAM record (FAMS linkage)
  for (const r of relationships) {
    if (r.type !== 'SPOUSE') continue;
    const key = [r.personId, r.relatedPersonId].sort().join('|');
    if (!spouseFamilies.has(key)) ensureFamily([r.personId, r.relatedPersonId]);
  }

  for (const m of members) {
    lines.push(`0 @I${m.id}@ INDI`);
    lines.push(`1 NAME ${gedcomName(m)}`);
    if (m.gender === 'MALE' || m.gender === 'FEMALE') lines.push(`1 SEX ${m.gender === 'MALE' ? 'M' : 'F'}`);
    if (m.nickname) lines.push(`1 NICK ${m.nickname}`);
    if (m.birthDate) {
      lines.push('1 BIRT', `2 DATE ${gedcomDate(m.birthDate)}`);
      if (m.birthPlace) lines.push(`2 PLAC ${m.birthPlace}`);
    }
    if (m.deathDate) {
      lines.push('1 DEAT', `2 DATE ${gedcomDate(m.deathDate)}`);
      if (m.deathPlace) lines.push(`2 PLAC ${m.deathPlace}`);
    }
    if (m.occupation) lines.push(`1 OCCU ${m.occupation}`);
    const noteParts: string[] = [];
    if (m.branch) noteParts.push(`Branch: ${m.branch}`);
    if (m.biography) noteParts.push(...m.biography.split('\n'));
    if (noteParts.length) {
      lines.push(`1 NOTE ${noteParts[0]}`);
      for (const cont of noteParts.slice(1)) lines.push(`2 CONT ${cont}`);
    }
    const familyId = familyOfChild.get(m.id);
    if (familyId) lines.push(`1 FAMC @${familyId}@`);
    const spouseKeys = [...new Set((spousesOf.get(m.id) || []).map((s) => [m.id, s].sort().join('|')))];
    for (const key of spouseKeys) {
      const famId = spouseFamilies.get(key);
      if (famId) lines.push(`1 FAMS @${famId}@`);
    }
  }
  for (const f of families) {
    lines.push(`0 @${f.id}@ FAM`);
    if (f.husband) lines.push(`1 HUSB @I${f.husband}@`);
    if (f.wife) lines.push(`1 WIFE @I${f.wife}@`);
    if (f.married) lines.push('1 MARR', `2 DATE ${gedcomDate(f.married)}`);
    for (const c of f.children) lines.push(`1 CHIL @I${c}@`);
  }
  lines.push('0 TRLR');
  return lines.join('\n') + '\n';
}

function gedcomName(m: GedcomPerson): string {
  // NAME Juan /Cruz/ with optional middle name
  const surname = m.lastName ? `/${m.lastName}/` : '';
  const given = [m.firstName, m.middleName].filter(Boolean).join(' ');
  return `${given} ${surname}`.trim();
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type GedcomIndividual = {
  xref: string;
  name: string;
  surname?: string;
  given?: string;
  sex?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  note: string;
  famc?: string;
  fams: string[];
};

export type GedcomFamily = {
  xref: string;
  husband?: string;
  wife?: string;
  children: string[];
  married?: string;
};

type Line = { level: number; xref?: string; tag: string; value: string };

export function parseGedcom(text: string): { individuals: GedcomIndividual[]; families: GedcomFamily[] } {
  const lines: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = raw.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/);
    if (!m) continue;
    lines.push({ level: Number(m[1]), xref: m[2], tag: m[3], value: m[4] || '' });
  }

  const individuals: GedcomIndividual[] = [];
  const families: GedcomFamily[] = [];
  const indiByXref = new Map<string, GedcomIndividual>();
  const famByXref = new Map<string, GedcomFamily>();

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.level !== 0) continue;
    if (l.tag === 'INDI' && l.xref) {
      const indi: GedcomIndividual = { xref: l.xref.replace(/[@]/g, ''), name: '', note: '', fams: [] };
      let noteLines: string[] = [];
      let parentTag = '';
      for (let j = i + 1; j < lines.length && lines[j].level > 0; j++) {
        const sub = lines[j];
        if (sub.level === 1) {
          parentTag = sub.tag;
          if (sub.tag === 'NAME') indi.name = sub.value;
          else if (sub.tag === 'SEX') indi.sex = sub.value;
          else if (sub.tag === 'OCCU') indi.occupation = sub.value;
          else if (sub.tag === 'FAMC') indi.famc = sub.value.replace(/[@]/g, '');
          else if (sub.tag === 'FAMS') indi.fams.push(sub.value.replace(/[@]/g, ''));
          else if (sub.tag === 'NOTE') noteLines = [sub.value];
        } else if (sub.level === 2) {
          if (sub.tag === 'DATE') {
            if (parentTag === 'BIRT') indi.birthDate = sub.value;
            else if (parentTag === 'DEAT') indi.deathDate = sub.value;
          } else if (sub.tag === 'PLAC') {
            if (parentTag === 'BIRT') indi.birthPlace = sub.value;
            else if (parentTag === 'DEAT') indi.deathPlace = sub.value;
          } else if (sub.tag === 'CONT' || sub.tag === 'CONC') {
            if (noteLines.length) noteLines[noteLines.length - 1] += (sub.tag === 'CONT' ? '\n' : '') + sub.value;
          }
        }
      }
      indi.note = noteLines.join('\n');
      // Split "Given /Surname/" style names
      const nm = indi.name.match(/^(.*?)\s*\/([^/]*)\/(.*)$/);
      if (nm) {
        indi.given = `${nm[1]} ${nm[3]}`.trim();
        indi.surname = nm[2];
      } else {
        const parts = indi.name.trim().split(/\s+/);
        indi.surname = parts.pop() || '';
        indi.given = parts.join(' ');
      }
      individuals.push(indi);
      indiByXref.set(indi.xref, indi);
    } else if (l.tag === 'FAM' && l.xref) {
      const fam: GedcomFamily = { xref: l.xref.replace(/[@]/g, ''), children: [] };
      for (let j = i + 1; j < lines.length && lines[j].level > 0; j++) {
        const sub = lines[j];
        if (sub.level !== 1) continue;
        if (sub.tag === 'HUSB') fam.husband = sub.value.replace(/[@]/g, '');
        else if (sub.tag === 'WIFE') fam.wife = sub.value.replace(/[@]/g, '');
        else if (sub.tag === 'CHIL') fam.children.push(sub.value.replace(/[@]/g, ''));
        else if (sub.tag === 'MARR') {
          if (lines[j + 1]?.level === 2 && lines[j + 1].tag === 'DATE') fam.married = lines[j + 1].value;
        }
      }
      families.push(fam);
      famByXref.set(fam.xref, fam);
    }
  }

  return { individuals, families };
}