'use client';

import { useState } from 'react';
import { Icon } from '../icons';
import { formatRelative } from '@/lib/utils';

type Log = {
  id: string;
  userName?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
};

export function AuditLogView({ logs, entityTypes, actions }: { logs: Log[]; entityTypes: string[]; actions: string[] }) {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const filtered = logs.filter((l) => (!entity || l.entityType === entity) && (!action || l.action === action));

  const renderValue = (v: unknown): string => {
    if (v == null) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input sm:w-52" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entity types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="input sm:w-52" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-line/60 text-[11px] uppercase tracking-wide text-inkSoft">
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Entity</th>
              <th className="px-4 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {filtered.map((l) => (
              <tr key={l.id} className="align-top transition hover:bg-parchment/40">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-inkSoft">{formatRelative(l.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-ink">{l.userName || 'System'}</td>
                <td className="px-4 py-3"><span className="badge-neutral">{l.action}</span></td>
                <td className="px-4 py-3 text-xs text-inkSoft">{l.entityType || '—'}{l.entityId ? ` #${l.entityId.slice(0, 8)}` : ''}</td>
                <td className="max-w-md px-4 py-3 text-xs text-inkSoft">
                  {(l.oldValue != null || l.newValue != null) && (
                    <div className="space-y-1">
                      {l.oldValue != null && (
                        <p><span className="font-semibold text-rust">old:</span> <span className="break-words">{renderValue(l.oldValue)}</span></p>
                      )}
                      {l.newValue != null && (
                        <p><span className="font-semibold text-sage">new:</span> <span className="break-words">{renderValue(l.newValue)}</span></p>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-inkSoft">
                  <Icon name="clock" className="mx-auto mb-2 h-6 w-6 text-inkSoft/40" />
                  No audit entries match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}