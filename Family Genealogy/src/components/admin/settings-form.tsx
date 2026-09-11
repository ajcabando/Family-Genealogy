'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icons';
import { cn } from '@/lib/utils';
import { HeroPhotoPicker } from './hero-photo-picker';

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
  const [heroUploading, setHeroUploading] = useState<Record<string, boolean>>({});
  const [heroMsg, setHeroMsg] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string>('heroBackground');
  const heroInputDashboard = useRef<HTMLInputElement>(null);
  const heroInputPhotos = useRef<HTMLInputElement>(null);
  const heroInputTree = useRef<HTMLInputElement>(null);

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

  async function uploadHero(file: File, key: string) {
    setHeroUploading((prev) => ({ ...prev, [key]: true }));
    setHeroMsg((prev) => ({ ...prev, [key]: '' }));
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/settings/hero?key=${key}`, { method: 'POST', body: fd });
    setHeroUploading((prev) => ({ ...prev, [key]: false }));
    if (res.ok) {
      const data = await res.json();
      setValues((prev) => ({ ...prev, [key]: data.path }));
      setHeroMsg((prev) => ({ ...prev, [key]: 'Hero image updated.' }));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setHeroMsg((prev) => ({ ...prev, [key]: data.error || 'Upload failed.' }));
    }
  }

  async function removeHero(key: string) {
    setHeroUploading((prev) => ({ ...prev, [key]: true }));
    setHeroMsg((prev) => ({ ...prev, [key]: '' }));
    const res = await fetch(`/api/settings/hero?key=${key}`, { method: 'DELETE' });
    setHeroUploading((prev) => ({ ...prev, [key]: false }));
    if (res.ok) {
      setValues((prev) => ({ ...prev, [key]: '' }));
      setHeroMsg((prev) => ({ ...prev, [key]: 'Hero image removed — will use default.' }));
      router.refresh();
    }
  }

  async function pickFromGallery(photoId: string, imagePath: string, settingKey: string) {
    setHeroUploading((prev) => ({ ...prev, [settingKey]: true }));
    setHeroMsg((prev) => ({ ...prev, [settingKey]: '' }));
    const res = await fetch('/api/settings/hero/from-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId, settingKey }),
    });
    setHeroUploading((prev) => ({ ...prev, [settingKey]: false }));
    if (res.ok) {
      setValues((prev) => ({ ...prev, [settingKey]: imagePath }));
      setHeroMsg((prev) => ({ ...prev, [settingKey]: 'Hero image updated from gallery.' }));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setHeroMsg((prev) => ({ ...prev, [settingKey]: data.error || 'Failed to set hero image.' }));
    }
  }

  function openPicker(key: string) {
    setPickerTarget(key);
    setPickerOpen(true);
  }

  const toggle = (key: string) => setValues((prev) => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }));

  const heroSections: Array<{ key: string; opacityKey: string; posYKey: string; title: string; desc: string; inputRef: React.RefObject<HTMLInputElement> }> = [
    { key: 'heroBackground', opacityKey: 'heroBackgroundOpacity', posYKey: 'heroBackgroundPosY', title: 'Dashboard Hero', desc: 'Background image for the main dashboard banner.', inputRef: heroInputDashboard },
    { key: 'photosHeroBackground', opacityKey: 'photosHeroBackgroundOpacity', posYKey: 'photosHeroBackgroundPosY', title: 'Photos Hero', desc: 'Background image for the photos gallery banner.', inputRef: heroInputPhotos },
    { key: 'treeHeroBackground', opacityKey: 'treeHeroBackgroundOpacity', posYKey: 'treeHeroBackgroundPosY', title: 'Family Tree Hero', desc: 'Background image for the family tree banner.', inputRef: heroInputTree },
  ];

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
        <h2 className="mb-4 font-display text-lg font-bold text-ink">Hero Backgrounds</h2>
        <p className="mb-4 text-sm text-inkSoft">Customize the background image and opacity for each page&apos;s hero banner. If no image is set, a default background is used.</p>
        <div className="space-y-5">
          {heroSections.map((section) => {
            const bgValue = values[section.key] || '';
            const opacityValue = parseInt(values[section.opacityKey] || '60', 10);
            const posYValue = parseInt(values[section.posYKey] || '50', 10);
            return (
              <div key={section.key} className="rounded-xl border border-line/40 bg-cream/50 p-4">
                <p className="mb-2 text-sm font-semibold text-ink">{section.title}</p>
                <p className="mb-3 text-xs text-inkSoft">{section.desc}</p>
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="h-28 w-48 shrink-0 overflow-hidden rounded-xl border border-line bg-parchment">
                    {bgValue ? (
                      <img src={`/api/files/${bgValue}`} alt={section.title} className="h-full w-full object-cover" style={{ opacity: opacityValue / 100, objectPosition: `50% ${posYValue}%` }} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-inkSoft">Default background</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => section.inputRef.current?.click()}
                        disabled={!!heroUploading[section.key]}
                        className="btn-ghost text-xs"
                      >
                        <Icon name="upload" className="h-3.5 w-3.5" /> {heroUploading[section.key] ? 'Uploading…' : 'Upload new image'}
                      </button>
                      <button
                        onClick={() => openPicker(section.key)}
                        disabled={!!heroUploading[section.key]}
                        className="btn-ghost text-xs"
                      >
                        <Icon name="photo" className="h-3.5 w-3.5" /> Choose from gallery
                      </button>
                      {bgValue && (
                        <button onClick={() => removeHero(section.key)} disabled={!!heroUploading[section.key]} className="btn-ghost text-xs text-rust">
                          <Icon name="trash" className="h-3.5 w-3.5" /> Remove image
                        </button>
                      )}
                      <input
                        ref={section.inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadHero(file, section.key);
                          if (section.inputRef.current) section.inputRef.current.value = '';
                        }}
                      />
                    </div>
                    {bgValue && (
                      <>
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-inkSoft">Background opacity</label>
                            <span className="text-xs font-semibold text-ink">{opacityValue}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={opacityValue}
                            onChange={(e) => setValues((prev) => ({ ...prev, [section.opacityKey]: e.target.value }))}
                            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-goldDeep"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-inkSoft">Vertical position</label>
                            <span className="text-xs font-semibold text-ink">{posYValue === 0 ? 'Top' : posYValue === 50 ? 'Center' : posYValue === 100 ? 'Bottom' : `${posYValue}%`}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={posYValue}
                            onChange={(e) => setValues((prev) => ({ ...prev, [section.posYKey]: e.target.value }))}
                            className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-goldDeep"
                          />
                          <div className="flex justify-between text-[10px] text-inkSoft/60">
                            <span>↑ Top</span>
                            <span>↓ Bottom</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {heroMsg[section.key] && <p className="mt-2 text-xs font-semibold text-sage">{heroMsg[section.key]}</p>}
              </div>
            );
          })}
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

      <HeroPhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(photoId, imagePath) => pickFromGallery(photoId, imagePath, pickerTarget)}
        title="Choose hero background"
      />
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