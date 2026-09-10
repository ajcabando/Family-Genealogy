import { describe, it, expect } from 'vitest';
import { serializeGedcom, parseGedcom, parseGedcomDate } from '../src/lib/gedcom';
import type { GedcomPerson, GedcomRel } from '../src/lib/gedcom';

const members: GedcomPerson[] = [
  { id: 'm1', firstName: 'Juan', lastName: 'Cruz', gender: 'MALE', birthDate: new Date(1945, 2, 12), birthPlace: 'Manila', deathDate: new Date(2020, 7, 4), occupation: 'Principal', biography: 'Line one\nLine two', branch: 'Cruz – Cebu' },
  { id: 'm2', firstName: 'Maria', lastName: 'Cruz', maidenName: 'Santos', gender: 'FEMALE', birthDate: new Date(1948, 10, 2) },
  { id: 'm3', firstName: 'Pedro', lastName: 'Cruz', gender: 'MALE', birthDate: new Date(1967, 0, 15) },
  { id: 'm4', firstName: 'Ana', lastName: 'Cruz', gender: 'FEMALE' },
  { id: 'm5', firstName: 'Carlos', lastName: 'Mendoza', gender: 'MALE' },
];

const rels: GedcomRel[] = [
  { id: 'r1', personId: 'm1', relatedPersonId: 'm2', type: 'SPOUSE', startDate: new Date(1965, 4, 30) },
  { id: 'r2', personId: 'm1', relatedPersonId: 'm3', type: 'PARENT' },
  { id: 'r3', personId: 'm2', relatedPersonId: 'm3', type: 'PARENT' },
  { id: 'r4', personId: 'm1', relatedPersonId: 'm4', type: 'PARENT' },
  { id: 'r5', personId: 'm2', relatedPersonId: 'm4', type: 'PARENT' },
  // spouse pair without children (m4 + m5)
  { id: 'r6', personId: 'm4', relatedPersonId: 'm5', type: 'SPOUSE' },
];

describe('GEDCOM export', () => {
  it('serializes all individuals and family records', () => {
    const ged = serializeGedcom(members, rels);
    expect(ged).toContain('0 HEAD');
    expect(ged).toContain('0 TRLR');
    expect((ged.match(/^0 @I/gm) || []).length).toBe(members.length);
    // m1+m2 family, m4+m5 family (no children still gets a FAM record)
    expect((ged.match(/^0 @F/gm) || []).length).toBe(2);
    expect(ged).toContain('1 NAME Juan /Cruz/');
    expect(ged).toContain('2 DATE 12 MAR 1945');
    expect(ged).toContain('1 SEX M');
    expect(ged).toContain('1 OCCU Principal');
    expect(ged).toContain('1 NOTE Branch: Cruz – Cebu');
    expect(ged).toContain('2 CONT Line two');
  });

  it('links children to their family via FAMC', () => {
    const ged = serializeGedcom(members, rels);
    const famc = ged.match(/1 FAMC @(F\d+)@/g) || [];
    expect(famc.length).toBe(2); // m3 and m4
  });

  it('round-trips through the parser', () => {
    const ged = serializeGedcom(members, rels);
    const { individuals, families } = parseGedcom(ged);
    expect(individuals.length).toBe(members.length);
    const juan = individuals.find((i) => i.surname === 'Cruz' && i.given?.startsWith('Juan'));
    expect(juan).toBeDefined();
    expect(juan?.birthDate).toBe('12 MAR 1945');
    expect(juan?.occupation).toBe('Principal');
    expect(juan?.note).toContain('Branch: Cruz – Cebu');
    expect(juan?.note).toContain('Line two');
    expect(families.length).toBe(2);
    const fam1 = families.find((f) => f.children.length === 2);
    expect(fam1?.husband).toBeDefined();
    expect(fam1?.married).toBe('30 MAY 1965');
  });
});

describe('GEDCOM date parsing', () => {
  it('parses common GEDCOM date formats', () => {
    const parts = (d: Date | null) => (d ? [d.getFullYear(), d.getMonth(), d.getDate()] : null);
    expect(parts(parseGedcomDate('12 MAR 1945'))).toEqual([1945, 2, 12]);
    expect(parts(parseGedcomDate('MAR 1945'))).toEqual([1945, 2, 1]);
    expect(parts(parseGedcomDate('1945'))).toEqual([1945, 0, 1]);
    expect(parts(parseGedcomDate('ABT 1945'))).toEqual([1945, 0, 1]);
    expect(parseGedcomDate('')).toBeNull();
    expect(parseGedcomDate('nonsense')).toBeNull();
  });
});

describe('GEDCOM import parsing', () => {
  it('parses a minimal external GEDCOM file', () => {
    const text = `0 HEAD
1 SOUR test
0 @I1@ INDI
1 NAME Test /Person/
1 SEX M
1 BIRT
2 DATE 12 MAR 1990
2 PLAC Cebu
0 @I2@ INDI
1 NAME Baby /Person/
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 TRLR
`;
    const { individuals, families } = parseGedcom(text);
    expect(individuals.length).toBe(2);
    expect(individuals[0].given).toBe('Test');
    expect(individuals[0].surname).toBe('Person');
    expect(individuals[0].sex).toBe('M');
    expect(individuals[0].birthDate).toBe('12 MAR 1990');
    expect(individuals[0].birthPlace).toBe('Cebu');
    expect(families[0].husband).toBe('I1');
    expect(families[0].children).toEqual(['I2']);
  });
});