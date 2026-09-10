'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Controls, Background, BackgroundVariant, useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildTreeData, expandAncestors, NODE_W, NODE_H } from '@/lib/genealogy';
import type { TreeMemberInput, TreeRelInput, TreeEdgeKind } from '@/lib/genealogy';
import { FamilyCardNode } from './family-card-node';
import { ProfileDrawer } from './profile-drawer';
import type { DrawerRel } from './profile-drawer';
import { Icon } from '../icons';
import { cn, fullName } from '@/lib/utils';

const EDGE_STYLES: Record<TreeEdgeKind, { stroke: string; width: number; type: 'smoothstep' | 'straight'; dash?: string; label?: string }> = {
  parent: { stroke: '#8a6d38', width: 2, type: 'smoothstep' },
  spouse: { stroke: '#b08d4f', width: 1.5, type: 'straight' },
  adopted: { stroke: '#7a8b6f', width: 2, type: 'smoothstep', dash: '7 5', label: 'adopted' },
  step: { stroke: '#a4583c', width: 2, type: 'smoothstep', dash: '3 5', label: 'step' },
};

type Props = {
  members: TreeMemberInput[];
  relationships: TreeRelInput[];
};

function TreeInner({ members, relationships }: Props) {
  const flow = useReactFlow();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState('');
  const [query, setQuery] = useState('');
  const pendingFocus = useRef<string | null>(null);

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

  const layout = useMemo(
    () => buildTreeData(filteredMembers, filteredRels, collapsed),
    [filteredMembers, filteredRels, collapsed],
  );

  const nodes: Node[] = useMemo(
    () =>
      [...layout.positions.entries()].map(([id, pos]) => {
        const person = layout.people.get(id)!;
        return {
          id,
          type: 'familyCard',
          position: pos,
          width: NODE_W,
          height: NODE_H,
          data: {
            person,
            selected: id === selectedId,
            hasChildren: (layout.children.get(id) || []).length > 0,
            collapsed: collapsed.has(id),
            onSelect: (pid: string) => {
              setSelectedId(pid);
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
    [layout, selectedId, collapsed],
  );

  const edges: Edge[] = useMemo(
    () =>
      layout.edges.map((e) => {
        const s = EDGE_STYLES[e.kind];
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          type: s.type,
          style: { stroke: s.stroke, strokeWidth: s.width, strokeDasharray: s.dash, opacity: 0.9 },
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
    [layout],
  );

  function requestFocus(id: string) {
    pendingFocus.current = id;
    setSelectedId(id);
    setCollapsed((prev) => expandAncestors(id, baseLayout.parents, prev));
  }

  useEffect(() => {
    if (!pendingFocus.current) return;
    const id = pendingFocus.current;
    const t = setTimeout(() => {
      const pos = layout.positions.get(id);
      if (pos) {
        flow.setCenter(pos.x + NODE_W / 2, pos.y + NODE_H / 2, { zoom: 1.1, duration: 500 });
        pendingFocus.current = null;
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, layout.positions]);

  // ---- Drawer data ----
  const selected = selectedId ? baseLayout.people.get(selectedId) : null;
  const relList = (ids: string[] | undefined): DrawerRel[] =>
    (ids || [])
      .map((id) => {
        const p = baseLayout.people.get(id);
        return p ? { id, name: fullName({ firstName: p.firstName, lastName: p.lastName }) } : null;
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

  return (
    <div className="relative h-[calc(100dvh-7rem)] w-full overflow-hidden rounded-2xl border border-line/60 bg-[#fdfbf6] shadow-card lg:h-[calc(100dvh-8.5rem)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ familyCard: FamilyCardNode }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.05}
        maxZoom={2.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => setSelectedId(node.id)}
        onPaneClick={() => setSelectedId(null)}
        className="rounded-2xl"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#d9cdb4" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>

      {/* Toolbar */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 w-72 max-w-[calc(100%-1.5rem)] space-y-2 sm:w-80">
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
          <button
            onClick={() => {
              pendingFocus.current = null;
              flow.fitView({ padding: 0.2, duration: 500 });
            }}
            className="rounded-xl border border-line/60 bg-white px-3 py-2 text-xs font-semibold text-inkSoft shadow-card transition hover:text-goldDeep"
          >
            Fit tree
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-full border border-line/60 bg-white/90 px-4 py-1.5 text-[10px] font-semibold text-inkSoft shadow-card backdrop-blur">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded bg-[#8a6d38]" /> parent</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded bg-[#b08d4f]" /> spouse</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-[#7a8b6f]" /> adopted</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dotted border-[#a4583c]" /> step</span>
      </div>

      {/* Drawer */}
      {selected && (
        <ProfileDrawer
          person={selected}
          parents={relList(baseLayout.parents.get(selected.id))}
          children={relList(baseLayout.children.get(selected.id))}
          spouses={relList(baseLayout.spouses.get(selected.id))}
          siblings={relList(baseLayout.siblings.get(selected.id))}
          onFocus={requestFocus}
          onClose={() => setSelectedId(null)}
        />
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