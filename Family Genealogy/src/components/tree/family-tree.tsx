'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ReactFlow, ReactFlowProvider, MiniMap, Background, BackgroundVariant, useReactFlow } from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildTreeData, expandAncestors, NODE_W, NODE_H, genStyle, GEN_STYLES } from '@/lib/genealogy';
import type { TreeMemberInput, TreeRelInput, TreeEdgeKind } from '@/lib/genealogy';
import { FamilyCardNode } from './family-card-node';
import { ProfileDrawer } from './profile-drawer';
import type { DrawerRel } from './profile-drawer';
import { Icon } from '../icons';
import { cn, fullName } from '@/lib/utils';

// Soft, heritage-toned relationship lines (never thick black strokes).
const EDGE_STYLES: Record<TreeEdgeKind, { stroke: string; width: number; type: 'smoothstep' | 'straight'; dash?: string; label?: string }> = {
  parent: { stroke: '#7D8AA8', width: 2, type: 'smoothstep' },
  spouse: { stroke: '#B9A9EC', width: 1.5, type: 'straight' },
  adopted: { stroke: '#31B48D', width: 2, type: 'smoothstep', dash: '7 5', label: 'adopted' },
  step: { stroke: '#FF7A59', width: 2, type: 'smoothstep', dash: '3 5', label: 'step' },
};

type FocusGroup = 'parents' | 'siblings' | 'spouse' | 'children';
const ALL_GROUPS: FocusGroup[] = ['parents', 'siblings', 'spouse', 'children'];
const GROUP_LABEL: Record<FocusGroup, string> = {
  parents: 'Parents',
  siblings: 'Siblings',
  spouse: 'Spouse',
  children: 'Children',
};

const BRANCH_COLORS: Record<string, string> = {
  'Cruz': '#3b82f6',
  'Reyes': '#22c55e',
  'Santos': '#a855f7',
};

function branchColor(branch?: string | null) {
  if (!branch) return '#cbd5e1';
  return BRANCH_COLORS[branch] || '#94a3b8';
}

type GenLabelData = { label: string; color: string };
type GenLabelNodeType = Node<GenLabelData, 'genLabel'>;

function GenLabelNode({ data }: NodeProps<GenLabelNodeType>) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: data.color, color: data.color, boxShadow: '0 1px 4px rgba(43,36,28,0.08)' }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: data.color }} />
      {data.label}
    </div>
  );
}

type Props = {
  members: TreeMemberInput[];
  relationships: TreeRelInput[];
  /** Person id from the URL (?focus=...) to select & center on. */
  focusId?: string;
};

function TreeInner({ members, relationships, focusId }: Props) {
  const flow = useReactFlow();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState('');
  const [query, setQuery] = useState('');
  const pendingFocus = useRef<string | null>(null);
  // View state (matches the controls bar)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [showGen, setShowGen] = useState(true);
  const [showBranches, setShowBranches] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  // Focus mode: show only the selected person + chosen relation groups.
  const [focusModeId, setFocusModeId] = useState<string | null>(null);
  const [focusGroups, setFocusGroups] = useState<Set<FocusGroup>>(new Set(ALL_GROUPS));

  const baseLayout = useMemo(() => buildTreeData(members, relationships), [members, relationships]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) if (m.branch) set.add(m.branch);
    return [...set].sort();
  }, [members]);

  // Branch filtering: keep branch members + all their ancestors
  const filteredMembers = useMemo(() => {
    if (!branchFilter) return members;
    const keep = new Set<string>();
    for (const m of members) if (m.branch === branchFilter) keep.add(m.id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of members) {
        if (!keep.has(m.id)) continue;
        for (const p of baseLayout.parents.get(m.id) || []) {
          if (!keep.has(p)) {
            keep.add(p);
            changed = true;
          }
        }
      }
    }
    return members.filter((m) => keep.has(m.id));
  }, [branchFilter, members, baseLayout]);

  const filteredRels = useMemo(() => {
    if (!branchFilter) return relationships;
    const ids = new Set(filteredMembers.map((m) => m.id));
    return relationships.filter((r) => ids.has(r.personId) && ids.has(r.relatedPersonId));
  }, [branchFilter, filteredMembers, relationships]);

  // Focus mode layout: the person + selected relation groups only.
  const focusLayout = useMemo(() => {
    if (!focusModeId) return null;
    const keep = new Set<string>([focusModeId]);
    const add = (list?: string[]) => (list || []).forEach((id) => keep.add(id));
    if (focusGroups.has('parents')) add(baseLayout.parents.get(focusModeId));
    if (focusGroups.has('siblings')) add(baseLayout.siblings.get(focusModeId));
    if (focusGroups.has('spouse')) add(baseLayout.spouses.get(focusModeId));
    if (focusGroups.has('children')) add(baseLayout.children.get(focusModeId));
    const fm = members.filter((m) => keep.has(m.id));
    const fr = relationships.filter((r) => keep.has(r.personId) && keep.has(r.relatedPersonId));
    return buildTreeData(fm, fr, collapsed);
  }, [focusModeId, focusGroups, members, relationships, collapsed, baseLayout]);

  const layout = focusLayout ?? buildTreeData(filteredMembers, filteredRels, collapsed);

  // Generation rows for lane labels: leftmost x + y per generation.
  const genRows = useMemo(() => {
    const rows = new Map<number, { x: number; y: number }>();
    for (const [id, pos] of layout.positions) {
      const p = layout.people.get(id);
      if (!p) continue;
      const cur = rows.get(p.generation);
      if (!cur || pos.x < cur.x) rows.set(p.generation, { x: pos.x, y: pos.y });
    }
    return rows;
  }, [layout]);

  // Everyone directly related to the selected person — used to fade the rest.
  const neighborIds = useMemo(() => {
    if (!selectedId) return null;
    const keep = new Set<string>([selectedId]);
    const add = (ids?: string[]) => (ids || []).forEach((i) => keep.add(i));
    add(layout.parents.get(selectedId));
    add(layout.children.get(selectedId));
    add(layout.spouses.get(selectedId));
    add(layout.siblings.get(selectedId));
    return keep;
  }, [selectedId, layout]);

  const nodes: Node[] = useMemo(
    () => [
      ...[...layout.positions.entries()].map(([id, pos]) => {
        const person = layout.people.get(id)!;
        return {
          id,
          type: 'familyCard' as const,
          position: pos,
          width: NODE_W,
          height: NODE_H,
          data: {
            person,
            selected: id === selectedId,
            dimmed: !!neighborIds && !neighborIds.has(id),
            hasChildren: (layout.children.get(id) || []).length > 0,
            collapsed: collapsed.has(id),
            showGen,
            showBranch: showBranches,
            branchColor: branchColor(person.branch),
            onSelect: (pid: string) => {
              setSelectedId(pid);
              // On touch devices, tapping a person opens the focused view.
              if (window.matchMedia('(max-width: 767px)').matches) enterFocus(pid);
            },
            onToggle: (pid: string) => {
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(pid)) next.delete(pid);
                else next.add(pid);
                return next;
              });
            },
          },
        };
      }),
      // Generation lane labels on the left of each row.
      ...[...genRows.entries()].map(([g, pos]) => {
        const style = genStyle(g);
        return {
          id: `gen:${g}`,
          type: 'genLabel' as const,
          position: { x: pos.x - 132, y: pos.y + NODE_H / 2 - 12 },
          width: 116,
          height: 24,
          selectable: false,
          focusable: false,
          draggable: false,
          data: { label: style.label, color: style.color },
        };
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, selectedId, neighborIds, collapsed, showGen, showBranches],
  );

  const edges: Edge[] = useMemo(
    () =>
      layout.edges.map((e) => {
        const s = EDGE_STYLES[e.kind];
        // Highlight the selected person's own relationships, fade the rest.
        const connected = !!selectedId && (e.from === selectedId || e.to === selectedId);
        const dimmed = !!selectedId && !connected;
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          type: s.type,
          zIndex: connected ? 1 : 0,
          style: {
            stroke: s.stroke,
            strokeWidth: connected ? s.width + 1 : s.width,
            strokeDasharray: s.dash,
            opacity: dimmed ? 0.16 : connected ? 1 : 0.9,
          },
          ...(e.kind === 'spouse' ? { sourceHandle: 'r', targetHandle: 'l' } : {}),
          ...(s.label
            ? {
                label: s.label,
                labelStyle: { fill: s.stroke, fontSize: 9, fontWeight: 600 },
                labelBgStyle: { fill: '#fffdf8', stroke: s.stroke, strokeWidth: 1 },
                labelBgPadding: [4, 2] as [number, number],
                labelBgBorderRadius: 4,
              }
            : {}),
        };
      }),
    [layout, selectedId],
  );

  const enterFocus = useCallback((id: string) => {
    setFocusModeId(id);
    setSelectedId(id);
    pendingFocus.current = id;
    setCollapsed((prev) => expandAncestors(id, baseLayout.parents, prev));
  }, [baseLayout]);

  function requestFocus(id: string) {
    // Leave focus mode and go to the full tree, centered on the person.
    setFocusModeId(null);
    pendingFocus.current = id;
    setSelectedId(id);
    setCollapsed((prev) => expandAncestors(id, baseLayout.parents, prev));
  }

  const toggleGroup = (g: FocusGroup) => {
    setFocusGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  // URL-driven focus (?focus=...) — select + center on the person.
  useEffect(() => {
    if (!focusId) return;
    setSelectedId(focusId);
    setFocusModeId(null);
    setViewMode('tree');
    setCollapsed((prev) => expandAncestors(focusId, baseLayout.parents, prev));
    pendingFocus.current = focusId;
  }, [focusId, baseLayout]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const id = pendingFocus.current;
    const t = setTimeout(() => {
      const pos = layout.positions.get(id);
      if (pos) {
        flow.setCenter(pos.x + NODE_W / 2, pos.y + NODE_H / 2, { zoom: focusModeId ? 1.4 : 1.1, duration: 500 });
        pendingFocus.current = null;
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, layout.positions, focusModeId]);

  // Fit the view when entering/exiting focus mode.
  useEffect(() => {
    if (focusModeId === null) return;
    const t = setTimeout(() => {
      flow.fitView({ padding: 0.18, duration: 400, maxZoom: 1.4 });
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusModeId, focusGroups]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (canvasRef.current) {
      canvasRef.current.requestFullscreen?.();
    }
  }

  // ---- Drawer data ----
  const selected = selectedId ? baseLayout.people.get(selectedId) : null;
  const relList = (ids: string[] | undefined): DrawerRel[] =>
    (ids || [])
      .map((id) => {
        const p = baseLayout.people.get(id);
        if (!p) return null;
        return {
          id,
          name: fullName({ firstName: p.firstName, lastName: p.lastName }),
          years: p.deathYear ? `${p.birthYear ?? '?'} – ${p.deathYear}` : p.birthYear ? `b. ${p.birthYear}` : '',
          thumb: p.thumbUrl || undefined,
        };
      })
      .filter(Boolean) as DrawerRel[];

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out: Array<{ id: string; name: string; years: string }> = [];
    for (const p of baseLayout.people.values()) {
      const hay = `${p.firstName} ${p.middleName || ''} ${p.lastName} ${p.branch || ''}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({ id: p.id, name: fullName({ firstName: p.firstName, lastName: p.lastName }), years: p.deathYear ? `${p.birthYear ?? '?'} – ${p.deathYear}` : p.birthYear ? `b. ${p.birthYear}` : '' });
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [query, baseLayout]);

  const focusedPerson = focusModeId ? baseLayout.people.get(focusModeId) : null;

  const listRows = useMemo(
    () =>
      [...baseLayout.people.values()].sort(
        (a, b) => a.generation - b.generation || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
      ),
    [baseLayout],
  );

  return (
    <div>
      {/* ---------- Controls bar ---------- */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/60 bg-white px-3 py-2 shadow-card">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setViewMode('tree')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition',
              viewMode === 'tree' ? 'bg-navyAccent text-white shadow-card' : 'text-inkSoft hover:bg-parchment hover:text-navyAccent',
            )}
          >
            <Icon name="tree" className="h-4 w-4" /> Tree View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition',
              viewMode === 'list' ? 'bg-navyAccent text-white shadow-card' : 'text-inkSoft hover:bg-parchment hover:text-navyAccent',
            )}
          >
            <Icon name="list" className="h-4 w-4" /> List View
          </button>
          <div className="mx-1 h-5 w-px bg-line" />
          <button
            onClick={() => setShowGen((s) => !s)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition',
              showGen ? 'bg-navyAccent/10 text-navyAccent' : 'text-inkSoft hover:bg-parchment hover:text-navyAccent',
            )}
            title="Toggle generation labels"
          >
            <Icon name="clock" className="h-4 w-4" /> Generations
          </button>
          <button
            onClick={() => setShowBranches((s) => !s)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition',
              showBranches ? 'bg-navyAccent/10 text-navyAccent' : 'text-inkSoft hover:bg-parchment hover:text-navyAccent',
            )}
            title="Color nodes by family branch"
          >
            <Icon name="users" className="h-4 w-4" /> Branches
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              pendingFocus.current = null;
              flow.fitView({ padding: 0.2, duration: 500 });
            }}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-inkSoft transition hover:bg-parchment hover:text-navyAccent"
            title="Full tree"
          >
            <Icon name="fullscreen" className="h-4 w-4" />
          </button>
          <button
            onClick={() => flow.zoomOut({ duration: 200 })}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-navyAccent"
            title="Zoom out"
          >
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-bold text-inkSoft">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => flow.zoomIn({ duration: 200 })}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-navyAccent"
            title="Zoom in"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-line" />
          <button
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-navyAccent"
            title="Fullscreen"
          >
            <Icon name="target" className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCollapsed(new Set())}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-navyAccent"
            title="Expand all"
          >
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ---------- Canvas / list ---------- */}
      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-2xl border border-line/60 bg-white shadow-card">
          <div className="border-b border-line/60 px-4 py-3">
            <div className="relative max-w-md">
              <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search family members..."
                className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-inkSoft/60 outline-none transition focus:border-navyAccent focus:ring-2 focus:ring-navyAccent/20"
              />
            </div>
          </div>
          <ul className="divide-y divide-line/60">
            {listRows
              .filter((p) => {
                if (!query.trim()) return true;
                return `${p.firstName} ${p.lastName} ${p.branch || ''}`.toLowerCase().includes(query.toLowerCase());
              })
              .map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-parchment/50">
                  {p.thumbUrl ? (
                    <img src={p.thumbUrl} alt={p.firstName} className={cn('h-10 w-10 rounded-full border object-cover', p.deceased ? 'border-line grayscale' : 'border-navyAccent/40')} />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navyAccent/10 font-display text-sm font-bold text-navyAccent">
                      {(p.firstName || '?')[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold text-ink">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-inkSoft">
                      {genStyle(p.generation).label}
                      {p.branch ? ` · ${p.branch}` : ''}
                    </p>
                  </div>
                  <span className="hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex" style={{ color: genStyle(p.generation).color, background: `${genStyle(p.generation).color}14` }}>
                    {p.birthYear ? `b. ${p.birthYear}` : 'living'}
                  </span>
                  <button
                    onClick={() => {
                      requestFocus(p.id);
                      setViewMode('tree');
                    }}
                    className="rounded-xl bg-navyAccent/10 px-3 py-1.5 text-xs font-bold text-navyAccent transition hover:bg-navyAccent hover:text-white"
                  >
                    Focus
                  </button>
                  <Link href={`/family/${p.id}`} className="flex h-8 w-8 items-center justify-center rounded-xl text-inkSoft transition hover:bg-parchment hover:text-navyAccent" aria-label="View profile">
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <div
          ref={canvasRef}
          className="relative h-[calc(100dvh-22rem)] min-h-[480px] w-full overflow-hidden rounded-2xl border border-line/60 bg-gradient-to-br from-white via-canvasLavender to-canvasBlue shadow-card lg:h-[calc(100dvh-22rem)]"
        >
          {/* Large heritage tree watermark behind the nodes (desktop/tablet) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 hidden bg-no-repeat sm:block"
            style={{ backgroundImage: "url('/tree-of-life.svg')", backgroundSize: '74%', backgroundPosition: 'center center', opacity: 0.04 }}
          />
          {/* Even more subtle on phones so it never competes with touch targets */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-no-repeat sm:hidden"
            style={{ backgroundImage: "url('/tree-of-life.svg')", backgroundSize: '76%', backgroundPosition: 'center center', opacity: 0.02 }}
          />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={{ familyCard: FamilyCardNode, genLabel: GenLabelNode }}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.05}
            maxZoom={2.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
            onMove={(_, viewport) => setZoom(viewport.zoom)}
            onNodeClick={(_, node) => {
              if (node.type === 'genLabel') return;
              setSelectedId(node.id);
              if (window.matchMedia('(max-width: 767px)').matches) enterFocus(node.id);
            }}
            onPaneClick={() => setSelectedId(null)}
            className="rounded-2xl"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="rgba(91, 75, 219, 0.05)" />
            <MiniMap
              position="bottom-left"
              pannable
              zoomable
              maskColor="rgba(99, 102, 241, 0.08)"
              nodeColor={(n) => (n.type === 'genLabel' ? 'transparent' : '#6366f1')}
              nodeStrokeWidth={2}
              style={{ display: 'block', width: 200, height: 140, background: 'rgba(255,255,255,0.94)', borderRadius: 12, boxShadow: '0 2px 10px rgba(43,36,28,0.12)' }}
            />
          </ReactFlow>

          {/* Always-visible minimap label */}
          <div className="pointer-events-none absolute bottom-[156px] left-3 z-10">
            <span className="rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-inkSoft shadow-card">Minimap</span>
          </div>

          {/* Legend */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-line/60 bg-white/95 px-3.5 py-1.5 text-[10px] font-semibold text-inkSoft shadow-card backdrop-blur sm:gap-x-4 sm:px-4">
              {GEN_STYLES.map((g) => (
                <span key={g.label} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: g.color }} />
                  {g.label}
                </span>
              ))}
            </div>
          </div>

          {/* Search toolbar (top-left) */}
          <div className="pointer-events-none absolute left-3 top-14 z-10 w-72 max-w-[calc(100%-1.5rem)] space-y-2 sm:w-80">
            <div className="pointer-events-auto relative">
              <div className="flex items-center gap-2 rounded-xl border border-line/60 bg-white px-3 py-2.5 shadow-card">
                <Icon name="search" className="h-4 w-4 text-inkSoft" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the family…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-inkSoft/60"
                />
              </div>
              {query.trim() && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-xl border border-line/60 bg-white shadow-lift">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        requestFocus(r.id);
                        setQuery('');
                      }}
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition hover:bg-parchment/60"
                    >
                      <span className="font-semibold text-ink">{r.name}</span>
                      <span className="text-xs text-inkSoft">{r.years}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-xl border border-line/60 bg-white px-3 py-2 text-xs font-semibold text-inkSoft shadow-card outline-none focus:border-gold"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button
                onClick={() => setCollapsed(new Set())}
                className="rounded-xl border border-line/60 bg-white px-3 py-2 text-xs font-semibold text-inkSoft shadow-card transition hover:text-goldDeep"
              >
                Expand all
              </button>
            </div>
          </div>

          {/* Focus mode bar */}
          {focusedPerson && (
            <div className="pointer-events-auto absolute inset-x-3 top-3 z-10 mx-auto max-w-xl rounded-2xl border border-line/60 bg-white/95 p-3 shadow-lift backdrop-blur lg:left-1/2 lg:-translate-x-1/2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-goldDeep">Focus</span>
                  <p className="truncate font-display text-sm font-bold text-ink">{fullName({ firstName: focusedPerson.firstName, lastName: focusedPerson.lastName })}</p>
                </div>
                <button
                  onClick={() => {
                    setFocusModeId(null);
                    setFocusGroups(new Set(ALL_GROUPS));
                    flow.fitView({ padding: 0.2, duration: 500 });
                  }}
                  className="shrink-0 rounded-lg bg-goldDeep px-3 py-1.5 text-xs font-bold text-white shadow-card transition hover:bg-gold"
                >
                  Full Tree
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {ALL_GROUPS.map((g) => {
                  const fid = focusModeId as string;
                  const count = (baseLayout[g === 'spouse' ? 'spouses' : g === 'children' ? 'children' : g === 'parents' ? 'parents' : 'siblings'].get(fid) || []).length;
                  const on = focusGroups.has(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGroup(g)}
                      disabled={count === 0}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40',
                        on ? 'bg-goldDeep text-white shadow-card' : 'border border-line bg-cream text-inkSoft hover:text-goldDeep',
                      )}
                    >
                      {GROUP_LABEL[g]}
                      {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drawer */}
          {selected && (
            <ProfileDrawer
              person={selected}
              parents={relList(baseLayout.parents.get(selected.id))}
              children={relList(baseLayout.children.get(selected.id))}
              spouses={relList(baseLayout.spouses.get(selected.id))}
              siblings={relList(baseLayout.siblings.get(selected.id))}
              onFocus={enterFocus}
              onClose={() => setSelectedId(null)}
              focusLabel={focusModeId === selected.id ? 'In focus view' : 'Focus on this person'}
              onFocusToggle={() => (focusModeId === selected.id ? setFocusModeId(null) : enterFocus(selected.id))}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function FamilyTree(props: Props) {
  return (
    <ReactFlowProvider>
      <TreeInner {...props} />
    </ReactFlowProvider>
  );
}