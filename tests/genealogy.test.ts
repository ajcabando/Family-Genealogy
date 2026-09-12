import { describe, it, expect } from 'vitest';
import { buildTreeData, expandAncestors } from '../src/lib/genealogy';
import type { TreeMemberInput, TreeRelInput } from '../src/lib/genealogy';

// Fixture: John + Mary -> Bob, Ann ; Bob + Sue -> Jim, Kate ; Ann + Tom -> Leo ; Bob adopted Pete
const members: TreeMemberInput[] = [
  { id: 'john', firstName: 'John', lastName: 'Smith', gender: 'MALE' },
  { id: 'mary', firstName: 'Mary', lastName: 'Smith', gender: 'FEMALE' },
  { id: 'bob', firstName: 'Bob', lastName: 'Smith', gender: 'MALE' },
  { id: 'ann', firstName: 'Ann', lastName: 'Smith', gender: 'FEMALE' },
  { id: 'sue', firstName: 'Sue', lastName: 'Green', gender: 'FEMALE' },
  { id: 'tom', firstName: 'Tom', lastName: 'Brown', gender: 'MALE' },
  { id: 'jim', firstName: 'Jim', lastName: 'Smith', gender: 'MALE' },
  { id: 'kate', firstName: 'Kate', lastName: 'Smith', gender: 'FEMALE' },
  { id: 'leo', firstName: 'Leo', lastName: 'Brown', gender: 'MALE' },
  { id: 'pete', firstName: 'Pete', lastName: 'Smith', gender: 'MALE' },
];

const rels: TreeRelInput[] = [
  { id: 'r1', personId: 'john', relatedPersonId: 'mary', type: 'SPOUSE' },
  { id: 'r2', personId: 'john', relatedPersonId: 'bob', type: 'PARENT' },
  { id: 'r3', personId: 'mary', relatedPersonId: 'bob', type: 'PARENT' },
  { id: 'r4', personId: 'john', relatedPersonId: 'ann', type: 'PARENT' },
  { id: 'r5', personId: 'mary', relatedPersonId: 'ann', type: 'PARENT' },
  { id: 'r6', personId: 'bob', relatedPersonId: 'sue', type: 'SPOUSE' },
  { id: 'r7', personId: 'bob', relatedPersonId: 'jim', type: 'PARENT' },
  { id: 'r8', personId: 'sue', relatedPersonId: 'jim', type: 'PARENT' },
  { id: 'r9', personId: 'bob', relatedPersonId: 'kate', type: 'PARENT' },
  { id: 'r10', personId: 'sue', relatedPersonId: 'kate', type: 'PARENT' },
  { id: 'r11', personId: 'ann', relatedPersonId: 'tom', type: 'SPOUSE' },
  { id: 'r12', personId: 'ann', relatedPersonId: 'leo', type: 'PARENT' },
  { id: 'r13', personId: 'tom', relatedPersonId: 'leo', type: 'PARENT' },
  { id: 'r14', personId: 'bob', relatedPersonId: 'pete', type: 'ADOPTED_PARENT' },
];

describe('buildTreeData', () => {
  it('places every member exactly once', () => {
    const layout = buildTreeData(members, rels);
    expect(layout.positions.size).toBe(members.length);
    for (const m of members) expect(layout.positions.has(m.id)).toBe(true);
    const ids = [...layout.positions.keys()];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts generations: parents above children', () => {
    const layout = buildTreeData(members, rels);
    const yOf = (id: string) => layout.positions.get(id)!.y;
    expect(yOf('john')).toBe(yOf('mary'));
    expect(yOf('bob')).toBeGreaterThan(yOf('john'));
    expect(yOf('ann')).toBeGreaterThan(yOf('john'));
    expect(yOf('jim')).toBeGreaterThan(yOf('bob'));
    expect(yOf('leo')).toBeGreaterThan(yOf('ann'));
  });

  it('keeps couples side by side on the same row', () => {
    const layout = buildTreeData(members, rels);
    const xOf = (id: string) => layout.positions.get(id)!.x;
    const yOf = (id: string) => layout.positions.get(id)!.y;
    // John & Mary in the same unit → same y, adjacent x (not overlapping)
    expect(yOf('john')).toBe(yOf('mary'));
    expect(Math.abs(xOf('john') - xOf('mary'))).toBeGreaterThan(0);
  });

  it('generates spouse and parent edges', () => {
    const layout = buildTreeData(members, rels);
    const spouseKeys = layout.edges.filter((e) => e.kind === 'spouse').map((e) => [e.from, e.to].sort().join('|'));
    expect(spouseKeys).toContain('john|mary');
    expect(spouseKeys).toContain('bob|sue');
    expect(spouseKeys).toContain('ann|tom');

    const parentKeys = layout.edges.filter((e) => e.kind === 'parent').map((e) => [e.from, e.to].sort().join('|'));
    expect(parentKeys).toContain('bob|john');
    expect(parentKeys).toContain('jim|sue');
    expect(parentKeys).toContain('ann|leo');
  });

  it('marks adopted edges separately', () => {
    const layout = buildTreeData(members, rels);
    const adopted = layout.edges.filter((e) => e.kind === 'adopted');
    expect(adopted.some((e) => e.from === 'bob' && e.to === 'pete')).toBe(true);
  });

  it('derives siblings from shared parents', () => {
    const layout = buildTreeData(members, rels);
    expect(layout.siblings.get('jim')).toContain('kate');
    expect(layout.siblings.get('kate')).toContain('jim');
    expect(layout.siblings.get('bob')).toContain('ann');
  });

  it('derives children and parents maps', () => {
    const layout = buildTreeData(members, rels);
    expect(layout.children.get('john')?.sort()).toEqual(['ann', 'bob']);
    expect(layout.parents.get('leo')?.sort()).toEqual(['ann', 'tom']);
  });

  it('collapse hides the whole descendant subtree', () => {
    const layout = buildTreeData(members, rels, new Set(['bob']));
    for (const hidden of ['jim', 'kate', 'pete']) {
      expect(layout.positions.has(hidden)).toBe(false);
    }
    for (const kept of ['john', 'mary', 'ann', 'leo', 'sue']) {
      expect(layout.positions.has(kept)).toBe(true);
    }
    // No edges touching hidden people
    const visibleIds = new Set(layout.positions.keys());
    for (const e of layout.edges) {
      expect(visibleIds.has(e.from) && visibleIds.has(e.to)).toBe(true);
    }
  });

  it('collapsing the root hides everything below it', () => {
    const layout = buildTreeData(members, rels, new Set(['john']));
    expect(layout.positions.size).toBe(2); // john + mary only
  });
});

describe('expandAncestors', () => {
  it('uncollapses every ancestor of a focused person', () => {
    const base = buildTreeData(members, rels);
    const collapsed = new Set(['john', 'bob']);
    const next = expandAncestors('jim', base.parents, collapsed);
    expect(next.has('john')).toBe(false);
    expect(next.has('bob')).toBe(false);
    // unrelated collapses stay
    collapsed.add('ann');
    const next2 = expandAncestors('jim', base.parents, collapsed);
    expect(next2.has('ann')).toBe(true);
  });
});

describe('multiple spouses', () => {
  const multiRels: TreeRelInput[] = [
    ...rels,
    { id: 'r15', personId: 'ann', relatedPersonId: 'carol', type: 'SPOUSE' },
    { id: 'r16', personId: 'ann', relatedPersonId: 'max', type: 'PARENT' },
    { id: 'r17', personId: 'carol', relatedPersonId: 'max', type: 'PARENT' },
  ];
  const multiMembers: TreeMemberInput[] = [
    ...members,
    { id: 'carol', firstName: 'Carol', lastName: 'Brown', gender: 'FEMALE' },
    { id: 'max', firstName: 'Max', lastName: 'Brown', gender: 'MALE' },
  ];

  it('renders a second spouse with their own children', () => {
    const layout = buildTreeData(multiMembers, multiRels);
    expect(layout.positions.has('carol')).toBe(true);
    expect(layout.positions.has('max')).toBe(true);
    const spouseKeys = layout.edges.filter((e) => e.kind === 'spouse').map((e) => [e.from, e.to].sort().join('|'));
    expect(spouseKeys).toContain('ann|carol');
    const parentKeys = layout.edges.filter((e) => e.kind === 'parent').map((e) => [e.from, e.to].sort().join('|'));
    expect(parentKeys).toContain('carol|max');
    expect(parentKeys).toContain('ann|max');
  });
});