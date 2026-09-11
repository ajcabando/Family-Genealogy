'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { cn, yearsRange } from '@/lib/utils';
import { NODE_W, NODE_H, genStyle } from '@/lib/genealogy';
import type { TreePerson } from '@/lib/genealogy';

export type FamilyCardData = {
  person: TreePerson;
  selected: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  showGen?: boolean;
  showBranch?: boolean;
  branchColor?: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

export type FamilyCardNodeType = Node<FamilyCardData, 'familyCard'>;

function FamilyCardNodeInner({ data }: NodeProps<FamilyCardNodeType>) {
  const { person, selected, hasChildren, collapsed, showGen, showBranch, branchColor } = data;
  const gen = genStyle(person.generation);

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center rounded-2xl border bg-white px-2 pb-2 pt-3 text-center shadow-card transition-all duration-200 select-none',
        selected ? 'border-navyAccent ring-2 ring-navyAccent/40 shadow-lift' : 'border-line hover:border-navyAccent/40 hover:shadow-lift',
      )}
      style={{ width: NODE_W, height: NODE_H, cursor: 'pointer', ...(showBranch && branchColor ? { borderColor: branchColor, boxShadow: `0 0 0 1px ${branchColor}55` } : {}) }}
      onClick={(e) => {
        e.stopPropagation();
        data.onSelect(person.id);
      }}
    >
      {/* Generation badge */}
      {showGen && (
        <span
          className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={{ borderColor: gen.color, color: gen.color, boxShadow: '0 1px 3px rgba(43,36,28,0.12)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: gen.color }} />
          {gen.label}
        </span>
      )}
      {/* invisible handles for edges */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />

      {person.thumbUrl ? (
        <img
          src={person.thumbUrl}
          alt={person.firstName}
          className={cn('h-16 w-16 rounded-full border-2 object-cover', person.deceased ? 'border-line grayscale' : 'border-navyAccent/40')}
          draggable={false}
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navyAccent/10 font-display text-lg font-bold text-navyAccent">
          {(person.firstName || '?')[0]}
        </div>
      )}

      <p className="mt-1.5 line-clamp-2 font-display text-[13px] font-bold leading-tight text-ink">
        {person.firstName} {person.lastName}
      </p>
      <p className={cn('mt-0.5 text-[11px] leading-tight', person.deceased ? 'text-inkSoft/70' : 'text-sage')}>
        {yearsRange(person.birthYear ? new Date(person.birthYear, 0).toISOString() : null, person.deathYear ? new Date(person.deathYear, 0).toISOString() : null)}
        {!person.deceased && !person.birthYear ? 'living' : ''}
      </p>

      {person.branch && (
        <span className="mt-1 max-w-[90%] truncate rounded-full bg-parchment px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-inkSoft">
          {person.branch}
        </span>
      )}

      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggle(person.id);
          }}
          className="absolute -bottom-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-navyAccent/40 bg-white text-xs font-bold text-navyAccent shadow-card transition hover:bg-navyAccent hover:text-white"
          title={collapsed ? 'Expand descendants' : 'Collapse descendants'}
        >
          {collapsed ? '+' : '−'}
        </button>
      )}
    </div>
  );
}

export const FamilyCardNode = memo(FamilyCardNodeInner);