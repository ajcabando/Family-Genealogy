'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icons';
import { cn } from '@/lib/utils';

const TOGGLES: Array<{ key: string; label: string; desc: string }> = [
  { key: 'photoApprovalRequired', label: 'Photo approval required', desc: 'Photos uploaded by family members appear as pending until an administrator approves them.' },
  { key: 'contributionApprovalRequired', label: 'Contribution approval required', desc: 'Genealogy and profile changes go through the approval queue before updating the official tree.' },
  { key: 'allowRegistration', label: 'Allow registration requests', desc: 'Anyone with the link can request an account; administrators approve each one.' },
  { key: 'showLivingBirthYearOnly', label: 'Protect living members', desc: 'Show only the birth year (and hide locations) of living members to non-administrators.' },
  { key: 'allowPhotoDownload', label: 'Allow photo downloads', desc: 'Family members can download full-resolution photos from the gallery.' },
];

export function SettingsForm({ settings, familyName }: { settings: Record<string, string>; familyName: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg('Settings saved.');
      router.refresh();
    } else {
      setMsg('Could not save settings.');
    }
  }

  const toggle = (key: string) => setValues((prev) => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }));

  return (
    <div className="min-w-0 space-y-6">
      <div className="card p-5">
        <h2 className="mb-4 font-display text-lg font-bold text-ink">General</h2>
        <div className="max-w-md">
          <label className="label">Family name</label>
          <input className="input" value={values.familyName ?? familyName} onChange={(e) => setValues((prev) => ({ ...prev, familyName: e.target.value }))} />
          <p className="mt-1 text-xs text-inkSoft">Shown in the app title and header.</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-display text-lg font-bold text-ink">Approvals &amp; Privacy</h2>
        <div className="space-y-1">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4 border-b border-line/40 py-3 last:border-0">
              <div>
                <p className="text-sm font-semibold text-ink">{t.label}</p>
                <p className="mt-0.5 text-xs text-inkSoft">{t.desc}</p>
              </div>
              <button
                onClick={() => toggle(t.key)}
                className={cn('relative h-6 w-11 shrink-0 rounded-full transition', values[t.key] === 'true' ? 'bg-goldDeep' : 'bg-line')}
                role="switch"
                aria-checked={values[t.key] === 'true'}
              >
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', values[t.key] === 'true' ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save settings'}</button>
        {msg && <span className="text-sm text-sage">{msg}</span>}
      </div>
    </div>
  );
}

export function BackupSection() {
  const [busy, setBusy] = useState(false);
  const [gedImport, setGedImport] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: '' });
  const gedInput = useRef<HTMLInputElement>(null);

  async function exportGedcom() {
    setBusy(true);
    const res = await fetch('/api/admin/gedcom');
    setBusy(false);
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.ged`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importGedcom(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGedImport({ busy: true, msg: '' });
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/gedcom', { method: 'POST', body: fd });
    if (res.ok) {
      const d = await res.json();
      const s = d.summary;
      setGedImport({ busy: false, msg: `Imported: ${s.created} new, ${s.reused} matched, ${s.relationships} relationships (${s.skipped} skipped).` });
    } else {
      const d = await res.json().catch(() => ({}));
      setGedImport({ busy: false, msg: d.error || 'Import failed.' });
    }
    if (gedInput.current) gedInput.current.value = '';
  }

  return (
    <div className="card min-w-0 p-5">
      <h2 className="mb-2 font-display text-lg font-bold text-ink">Backup &amp; Restore</h2>
      <p className="text-sm text-inkSoft">
        Your family&apos;s history is precious — keep regular backups. Several options are available:
      </p>
      <ul className="mt-3 space-y-3 text-sm">
        <li className="rounded-xl bg-cream p-3.5">
          <p className="font-semibold text-ink">0 · GEDCOM — export / import the family tree</p>
          <p className="mt-1 text-xs text-inkSoft">The standard genealogy format. Import matches existing members by name + birth year and adds the rest.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={exportGedcom} disabled={busy} className="btn-ghost text-xs">
              <Icon name="download" className="h-3.5 w-3.5" /> {busy ? 'Preparing…' : 'Export GEDCOM'}
            </button>
            <button
              onClick={() => gedInput.current?.click()}
              disabled={gedImport.busy}
              className="btn-ghost text-xs"
            >
              <Icon name="upload" className="h-3.5 w-3.5" /> {gedImport.busy ? 'Importing…' : 'Import GEDCOM'}
            </button>
            <input ref={gedInput} type="file" accept=".ged" className="hidden" onChange={importGedcom} />
          </div>
          {gedImport.msg && <p className="mt-2 text-xs font-semibold text-goldDeep">{gedImport.msg}</p>}
        </li>
        <li className="rounded-xl bg-cream p-3.5">
          <p className="font-semibold text-ink">1 · Download a full archive (JSON)</p>
          <p className="mt-1 text-xs text-inkSoft">Members, relationships, photos metadata, reunions, users, change requests and audit logs.</p>
          <button
            onClick={async () => {
              setBusy(true);
              const res = await fetch('/api/admin/backup');
              setBusy(false);
              if (!res.ok) return;
              const blob = await res.blob();
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `family-archive-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            disabled={busy}
            className="btn-ghost mt-2 text-xs"
          >
            <Icon name="download" className="h-3.5 w-3.5" /> {busy ? 'Preparing…' : 'Download backup'}
          </button>
        </li>
        <li className="rounded-xl bg-cream p-3.5">
          <p className="font-semibold text-ink">2 · Full database dump (recommended)</p>
          <p className="mt-1 text-xs text-inkSoft">
            Run this on the host machine to snapshot the entire database including photo files stored in the uploads volume:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-ink p-3 font-mono text-[11px] text-white">
{`docker compose exec db pg_dump -U family family_archive > backup.sql
docker compose cp app:/data/uploads ./uploads-backup`}
          </pre>
          <p className="mt-1 text-xs text-inkSoft">
            Restore: <code className="rounded bg-parchment px-1 font-mono">cat backup.sql | docker compose exec -T db psql -U family family_archive</code>
          </p>
        </li>
      </ul>
    </div>
  );
}