import { photoUrl } from './utils';

export const NODE_W = 180;
export const NODE_H = 186;
const COUPLE_GAP = 34;
const GEN_GAP = 116;
const UNIT_GAP = 64;

// Generation lane colors + labels (matches the tree legend on the tree page).
export const GEN_STYLES: Array<{ label: string; color: string }> = [
  { label: 'Grandparents', color: '#F06A8A' },
  { label: 'Parents', color: '#4C8BF5' },
  { label: 'Siblings', color: '#31B48D' },
  { label: 'Spouse', color: '#8B5CF6' },
  { label: 'Children', color: '#FF7A59' },
  { label: 'Grandchildren', color: '#35B8C4' },
  { label: 'Great-Grandchildren', color: '#F6C85F' },
];

export function genStyle(g: number) {
  return GEN_STYLES[g] || GEN_STYLES[GEN_STYLES.length - 1];
}

export type TreePerson = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  nickname?: string | null;
  gender: string;
  birthYear?: number | null;
  deathYear?: number | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  thumbUrl: string;
  branch?: string | null;
  occupation?: string | null;
  location?: string | null;
  deceased: boolean;
  generation: number;
  photoThumb?: string | null;
};

export type TreeEdgeKind = 'parent' | 'adopted' | 'step' | 'spouse';

export type TreeEdgeLayout = {
  id: string;
  from: string;
  to: string;
  kind: TreeEdgeKind;
  label?: string;
};

export type TreeLayout = {
  positions: Map<string, { x: number; y: number }>;
  edges: TreeEdgeLayout[];
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
  spouses: Map<string, string[]>;
  siblings: Map<string, string[]>;
  people: Map<string, TreePerson>;
  maxX: number;
  maxY: number;
};

export type TreeMemberInput = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  nickname?: string | null;
  gender: string;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  birthPlace?: string | null;
  branch?: string | null;
  occupation?: string | null;
  location?: string | null;
  profilePhoto?: { thumbPath?: string | null } | null;
};

export type TreeRelInput = {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: string;
  startDate?: Date | string | null;
  status?: string;
};

type RelMap = {
  parentKind: Map<string, Array<{ parentId: string; kind: 'parent' | 'adopted' | 'step' }>>;
  spouses: Map<string, Array<{ id: string; startDate?: Date | string | null }>>;
};

function isParentLike(t: string): boolean {
  return t === 'PARENT' || t === 'ADOPTED_PARENT' || t === 'STEP_PARENT';
}

export function buildTreeData(
  members: TreeMemberInput[],
  relationships: TreeRelInput[],
  collapsed: Set<string> = new Set(),
): TreeLayout {
  const people = new Map<string, TreePerson>();
  for (const m of members) {
    const b = m.birthDate ? new Date(m.birthDate) : null;
    const d = m.deathDate ? new Date(m.deathDate) : null;
    people.set(m.id, {
      id: m.id,
      firstName: m.firstName,
      middleName: m.middleName,
      lastName: m.lastName,
      nickname: m.nickname,
      gender: m.gender,
      birthYear: b ? b.getFullYear() : null,
      deathYear: d ? d.getFullYear() : null,
      birthDate: m.birthDate ? new Date(m.birthDate).toISOString() : null,
      birthPlace: m.birthPlace,
      thumbUrl: photoUrl({ thumbPath: m.profilePhoto?.thumbPath }),
      branch: m.branch,
      occupation: m.occupation,
      location: m.location,
      deceased: !!d,
      generation: 0,
      photoThumb: m.profilePhoto?.thumbPath ?? null,
    });
  }

  const relMap: RelMap = { parentKind: new Map(), spouses: new Map() };
  for (const r of relationships) {
    if (isParentLike(r.type)) {
      const kind = r.type === 'PARENT' ? 'parent' : r.type === 'ADOPTED_PARENT' ? 'adopted' : 'step';
      const list = relMap.parentKind.get(r.relatedPersonId) || [];
      list.push({ parentId: r.personId, kind });
      relMap.parentKind.set(r.relatedPersonId, list);
    } else if (r.type === 'SPOUSE') {
      for (const [a, b] of [
        [r.personId, r.relatedPersonId],
        [r.relatedPersonId, r.personId],
      ]) {
        const list = relMap.spouses.get(a) || [];
        list.push({ id: b, startDate: r.startDate });
        relMap.spouses.set(a, list);
      }
    }
  }

  // Deterministic ordering
  const allIds = [...people.keys()].sort((a, b) => {
    const pa = people.get(a)!;
    const pb = people.get(b)!;
    return pa.lastName.localeCompare(pb.lastName) || pa.firstName.localeCompare(pb.firstName) || a.localeCompare(b);
  });

  // ---- Generations ----
  // A person's generation is their deepest parent chain, but spouses always
  // share a row, so the couple's generation is the max of both partners.
  const gen = new Map<string, number>();
  const genMemo = (id: string, seen: Set<string>): number => {
    if (gen.has(id)) return gen.get(id)!;
    if (seen.has(id)) return 0; // cycle guard (shouldn't happen after validation)
    seen.add(id);
    const parents = (relMap.parentKind.get(id) || []).map((p) => p.parentId);
    let g = parents.length ? 1 + Math.max(...parents.map((p) => genMemo(p, seen))) : 0;
    for (const s of relMap.spouses.get(id) || []) {
      g = Math.max(g, genMemo(s.id, seen));
    }
    seen.delete(id);
    gen.set(id, g);
    return g;
  };
  for (const id of allIds) genMemo(id, new Set());

  // Attach the generation to each person for row labels / badges.
  for (const [id, g] of gen) {
    const p = people.get(id);
    if (p) p.generation = g;
  }

  // ---- Couple units ----
  type Unit = {
    id: string;
    main: string;
    persons: string[];
    children: Array<{ childId: string; kind: 'parent' | 'adopted' | 'step' }>;
  };
  const units: Unit[] = [];
  const unitOf = new Map<string, string>(); // personId -> unit id (main placement)
  const unitById = new Map<string, Unit>();

  const addUnit = (u: Unit) => {
    units.push(u);
    unitById.set(u.id, u);
    for (const pid of u.persons) if (!unitOf.has(pid)) unitOf.set(pid, u.id);
    return u;
  };

  const spouseSorted = (id: string) =>
    (relMap.spouses.get(id) || []).sort(
      (a, b) => (a.startDate ? new Date(a.startDate).getTime() : Infinity) - (b.startDate ? new Date(b.startDate).getTime() : Infinity) || a.id.localeCompare(b.id),
    );

  // A child belongs to a unit when all its 'parent' parents sit in that unit's
  // person row (covers couples and single parents). First unit to claim a child
  // wins in layout; edges are drawn from every actual parent.
  const childrenOfUnit = (persons: string[]): Array<{ childId: string; kind: 'parent' }> => {
    const out: Array<{ childId: string; kind: 'parent' }> = [];
    for (const [childId, list] of relMap.parentKind) {
      const parentIds = list.filter((l) => l.kind === 'parent').map((l) => l.parentId);
      if (parentIds.length === 0) continue;
      const allInUnit = parentIds.every((p) => persons.includes(p));
      if (allInUnit && !out.some((c) => c.childId === childId)) out.push({ childId, kind: 'parent' });
    }
    return out;
  };

  for (const id of allIds) {
    // Each person is rendered once — in their first unit. Additional spouses of
    // that person join the same row (hub layout); children attach by parent set.
    if (unitOf.has(id)) continue;
    const spouses = spouseSorted(id);
    if (spouses.length) {
      addUnit({ id: `u:${id}`, main: id, persons: [id, ...spouses.map((s) => s.id)], children: childrenOfUnit([id, ...spouses.map((s) => s.id)]) });
    } else {
      addUnit({ id: `u:${id}`, main: id, persons: [id], children: childrenOfUnit([id]) });
    }
  }

  // Attach adopted/step children to the adopting parent's unit
  const adoptedAttachments = new Map<string, Array<{ parentId: string; kind: 'adopted' | 'step' }>>();
  for (const [childId, list] of relMap.parentKind) {
    for (const entry of list) {
      if (entry.kind === 'parent') continue;
      const arr = adoptedAttachments.get(childId) || [];
      arr.push({ parentId: entry.parentId, kind: entry.kind });
      adoptedAttachments.set(childId, arr);
    }
  }
  for (const [childId, list] of adoptedAttachments) {
    for (const a of list) {
      const u = unitById.get(unitOf.get(a.parentId) || '');
      if (u && !u.children.some((c) => c.childId === childId && c.kind === a.kind)) {
        u.children.push({ childId, kind: a.kind });
      }
    }
  }

  // ---- Layout ----
  // hiddenByCollapse: every descendant (via parent/adopted/step edges) of a
  // collapsed person. The collapsed persons themselves stay visible; a collapse
  // only hides what is below it.
  const hiddenByCollapse = new Set<string>();
  for (const c of collapsed) {
    const stack = [c];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const [childId, list] of relMap.parentKind) {
        if (list.some((l) => l.parentId === cur) && !hiddenByCollapse.has(childId)) {
          hiddenByCollapse.add(childId);
          stack.push(childId);
        }
      }
    }
  }

  // A unit is hidden when any of its members is hidden (covers spouses who
  // share a row with a hidden descendant).
  const hiddenUnit = (u: Unit) => u.persons.some((p) => hiddenByCollapse.has(p));
  // A unit that contains a collapsed (visible) person renders itself but stops
  // the recursion into its children.
  const collapsedUnit = (u: Unit) => u.persons.some((p) => collapsed.has(p));
  // Couples share a row: the unit's generation is the max across all persons.
  const unitGen = (u: Unit) => Math.max(...u.persons.map((p) => gen.get(p) ?? 0));

  const ownWidth = (u: Unit) => u.persons.length * NODE_W + Math.max(0, u.persons.length - 1) * COUPLE_GAP;

  const childUnitsOf = (u: Unit): Unit[] => {
    const seen = new Set<string>();
    const out: Unit[] = [];
    for (const c of u.children) {
      const cu = unitById.get(unitOf.get(c.childId) || '');
      if (cu && !seen.has(cu.id) && !hiddenUnit(cu)) {
        seen.add(cu.id);
        out.push(cu);
      }
    }
    return out;
  };

  const spanMemo = new Map<string, number>();
  const span = (u: Unit): number => {
    if (spanMemo.has(u.id)) return spanMemo.get(u.id)!;
    if (hiddenUnit(u)) {
      spanMemo.set(u.id, ownWidth(u));
      return ownWidth(u);
    }
    const cus = childUnitsOf(u);
    const childSpan = cus.reduce((s, cu) => s + span(cu), 0);
    const gaps = Math.max(0, cus.length - 1) * UNIT_GAP;
    const total = Math.max(ownWidth(u), childSpan + gaps);
    spanMemo.set(u.id, total);
    return total;
  };

  const positions = new Map<string, { x: number; y: number }>();
  const placedUnits = new Set<string>();

  const place = (u: Unit, x: number) => {
    if (placedUnits.has(u.id) || hiddenUnit(u)) return;
    placedUnits.add(u.id);
    const w = span(u);
    const cx = x + w / 2;
    const ow = ownWidth(u);
    let px = cx - ow / 2;
    const y = unitGen(u) * (NODE_H + GEN_GAP);
    for (const pid of u.persons) {
      if (!positions.has(pid)) positions.set(pid, { x: px, y });
      px += NODE_W + COUPLE_GAP;
    }
    if (collapsedUnit(u)) return;
    let cx2 = x;
    for (const cu of childUnitsOf(u)) {
      place(cu, cx2);
      cx2 += span(cu) + UNIT_GAP;
    }
  };

  const isRootUnit = (u: Unit) => {
    for (const other of units) {
      if (other === u) continue;
      if (other.children.some((c) => c.childId === u.main)) return false;
    }
    return true;
  };

  const roots = units.filter(isRootUnit).sort((a, b) => gen.get(a.main)! - gen.get(b.main)! || a.id.localeCompare(b.id));
  let cursor = 0;
  for (const r of roots) {
    place(r, cursor);
    cursor += span(r) + UNIT_GAP;
  }
  // Safety: place any leftover visible units (e.g. weird attachment cases)
  for (const u of units) {
    if (!placedUnits.has(u.id) && !hiddenUnit(u)) {
      place(u, cursor);
      cursor += span(u) + UNIT_GAP;
    }
  }

  // ---- Edges ----
  const edges: TreeEdgeLayout[] = [];
  const edgeSeen = new Set<string>();
  const addEdge = (from: string, to: string, kind: TreeEdgeKind, label?: string) => {
    const key = `${from}|${to}|${kind}`;
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({ id: key, from, to, kind, label });
  };

  for (const u of units) {
    if (hiddenUnit(u)) continue;
    // spouse edges: hub layout (persons[0] is the shared spouse)
    if (u.persons.length > 1) {
      for (let i = 1; i < u.persons.length; i++) {
        addEdge(u.persons[0], u.persons[i], 'spouse');
      }
    }
    // parent edges
    for (const c of u.children) {
      const childUnit = unitById.get(unitOf.get(c.childId) || '');
      if (!childUnit || hiddenUnit(childUnit)) continue;
      if (c.kind === 'parent') {
        const parents = (relMap.parentKind.get(c.childId) || []).filter((p) => p.kind === 'parent').map((p) => p.parentId);
        for (const p of parents) {
          if (u.persons.includes(p)) addEdge(p, c.childId, 'parent');
        }
      }
    }
  }
  // adopted/step edges drawn from the adopting parent (handles cross-unit attachments)
  for (const [childId, list] of adoptedAttachments) {
    for (const a of list) {
      const parentUnit = unitById.get(unitOf.get(a.parentId) || '');
      if (parentUnit && !hiddenUnit(parentUnit) && !hiddenUnit(unitById.get(unitOf.get(childId) || '')!)) {
        addEdge(a.parentId, childId, a.kind, a.kind === 'adopted' ? 'adopted' : 'step');
      }
    }
  }

  // ---- Derived relation maps ----
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const spouses = new Map<string, string[]>();
  const siblings = new Map<string, string[]>();

  for (const [childId, list] of relMap.parentKind) {
    const p = list.filter((l) => l.kind === 'parent').map((l) => l.parentId);
    if (p.length) parents.set(childId, p);
    for (const entry of p) {
      const arr = children.get(entry) || [];
      if (!arr.includes(childId)) arr.push(childId);
      children.set(entry, arr);
    }
  }
  for (const [id, list] of relMap.spouses) {
    spouses.set(id, list.map((s) => s.id));
  }
  for (const [childId, parentList] of parents) {
    for (const otherChild of allIds) {
      if (otherChild === childId) continue;
      const otherParents = parents.get(otherChild);
      if (otherParents && otherParents.some((p) => parentList.includes(p))) {
        const arr = siblings.get(childId) || [];
        if (!arr.includes(otherChild)) arr.push(otherChild);
        siblings.set(childId, arr);
      }
    }
  }

  let maxX = 0;
  let maxY = 0;
  for (const p of positions.values()) {
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }

  return { positions, edges, parents, children, spouses, siblings, people, maxX, maxY };
}

export function expandAncestors(personId: string, parents: Map<string, string[]>, collapsed: Set<string>): Set<string> {
  const next = new Set(collapsed);
  let cur: string | undefined = personId;
  const seen = new Set<string>();
  while (cur) {
    if (next.has(cur)) next.delete(cur);
    if (seen.has(cur)) break;
    seen.add(cur);
    cur = parents.get(cur)?.[0];
  }
  return next;
}