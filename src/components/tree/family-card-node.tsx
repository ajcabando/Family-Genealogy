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
  /** True while someone else is selected — this card is not directly related. */
  dimmed?: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  showGen?: boolean;
  showBranch?: boolean;
  branchColor?: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

export type FamilyCardNodeType = Node<FamilyCardData, 'familyCard'>;

const GENDER_GLYPH: Record<string, { glyph: string; color: string; label: string }> = {
  MALE: { glyph: '♂', color: '#4C8BF5', label: 'Male' },
  FEMALE: { glyph: '♀', color: '#F06A8A', label: 'Female' },
};

function FamilyCardNodeInner({ data }: NodeProps<FamilyCardNodeType>) {
  const { person, selected, dimmed, hasChildren, collapsed, showGen, showBranch, branchColor } = data;
  const gen = genStyle(person.generation);
  const gender = GENDER_GLYPH[person.gender];

  // Branch colour wins while that view is on; otherwise the generation accent.
  const tint = showBranch && branchColor ? branchColor : gen.color;

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center rounded-2xl border bg-white px-2 pb-2 pt-3 text-center shadow-card transition-all duration-200 select-none',
        selected ? 'z-10 scale-[1.03] shadow-lift' : 'hover:-translate-y-0.5 hover:shadow-lift',
        dimmed && 'opacity-40 saturate-50',
      )}
      style={{
        width: NODE_W,
        height: NODE_H,
        cursor: 'pointer',
        borderColor: selected ? tint : `${tint}59`,
        ...(selected ? { boxShadow: `0 0 0 3px ${tint}33, 0 16px 32px -16px ${tint}` } : {}),
      }}
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
          className={cn(
            'h-16 w-16 rounded-full border-2 object-cover transition',
            person.deceased ? 'border-line grayscale' : '',
            !person.deceased && !selected ? 'border-navyAccent/30 group-hover:border-navyAccent/60' : '',
          )}
          style={!person.deceased && selected ? { borderColor: tint } : undefined}
          draggable={false}
        />
      ) : (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full font-display text-lg font-bold"
          style={{ background: `${tint}1f`, color: tint }}
        >
          {(person.firstName || '?')[0]}
        </div>
      )}

      <p className="mt-1.5 line-clamp-2 font-display text-[13px] font-bold leading-tight text-ink">
        {person.firstName} {person.lastName}
      </p>
      <p className={cn('mt-0.5 flex items-center justify-center gap-1 text-[11px] leading-tight', person.deceased ? 'text-inkSoft/70' : 'text-sage')}>
        <span>
          {yearsRange(person.birthYear ? new Date(person.birthYear, 0).toISOString() : null, person.deathYear ? new Date(person.deathYear, 0).toISOString() : null)}
          {!person.deceased && !person.birthYear ? 'living' : ''}
        </span>
        {gender && (
          <span aria-label={gender.label} title={gender.label} style={{ color: gender.color }} className="text-[12px] font-bold leading-none">
            {gender.glyph}
          </span>
        )}
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
