'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { cn } from '@/lib/utils';

type MemberOption = { id: string; name: string };

export function UploadModal({
  albumId,
  members,
  approvalRequired,
  open,
  onClose,
}: {
  albumId?: string;
  members: MemberOption[];
  approvalRequired: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [photoDate, setPhotoDate] = useState('');
  const [location, setLocation] = useState('');
  const [photographer, setPhotographer] = useState('');
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = [...list].filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imgs]);
  }

  async function submit() {
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('file', files[i]);
      fd.append('caption', caption);
      fd.append('photoDate', photoDate);
      fd.append('location', location);
      fd.append('photographer', photographer);
      fd.append('tags', JSON.stringify([...tagIds]));
      if (albumId) fd.append('albumId', albumId);
      const res = await fetch('/api/photos', { method: 'POST', body: fd });
      if (res.ok) ok++;
      setProgress(i + 1);
    }
    setUploading(false);
    if (ok === files.length) {
      setDone(true);
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1400);
    } else {
      setError(`${ok} of ${files.length} uploaded — some may already be under review.`);
    }
  }

  const input = 'input';
  const label = 'label';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 animate-fade-in" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lift animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Upload photos</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-inkSoft hover:bg-parchment"><Icon name="x" /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 text-sage"><Icon name="check" className="h-6 w-6" /></div>
            <p className="text-sm text-inkSoft">
              {approvalRequired
                ? 'Photos uploaded and sent for review. They will appear in the gallery once approved.'
                : 'Photos uploaded successfully.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <div className="rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust">{error}</div>}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInput.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition',
                dragOver ? 'border-gold bg-gold/5' : 'border-line bg-cream hover:border-goldLight',
              )}
            >
              <Icon name="upload" className="h-8 w-8 text-goldDeep" />
              <p className="text-sm font-semibold text-ink">Drag & drop photos here, or tap to browse</p>
              <p className="text-xs text-inkSoft">JPG, PNG, WEBP, HEIC</p>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInput.current?.click();
                }}
                className="btn-gold w-full"
              >
                <Icon name="camera" className="h-4 w-4" /> Take photo
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInput.current?.click();
                }}
                className="btn-ghost w-full"
              >
                <Icon name="photo" className="h-4 w-4" /> Choose photos
              </button>
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line/60">
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white"
                    >
                      <Icon name="x" className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Caption</label>
                <input className={input} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Applied to all photos" />
              </div>
              <div>
                <label className={label}>Date taken</label>
                <input type="date" className={input} value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} />
              </div>
              <div>
                <label className={label}>Location</label>
                <input className={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Cebu City" />
              </div>
              <div>
                <label className={label}>Photographer</label>
                <input className={input} value={photographer} onChange={(e) => setPhotographer(e.target.value)} placeholder="Who took these?" />
              </div>
            </div>

            <div>
              <label className={label}>Tag family members</label>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-cream p-2">
                {members.length === 0 && <p className="p-2 text-xs text-inkSoft">No family members available to tag.</p>}
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {members.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white">
                      <input
                        type="checkbox"
                        checked={tagIds.has(m.id)}
                        onChange={(e) => {
                          const next = new Set(tagIds);
                          if (e.target.checked) next.add(m.id);
                          else next.delete(m.id);
                          setTagIds(next);
                        }}
                        className="h-4 w-4 rounded border-line accent-goldDeep"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={submit} disabled={uploading || files.length === 0} className="btn-primary w-full">
              {uploading ? `Uploading ${progress}/${files.length}…` : `Upload ${files.length ? `${files.length} photo${files.length === 1 ? '' : 's'}` : 'photos'}`}
            </button>
            {approvalRequired && (
              <p className="text-center text-xs text-inkSoft">Uploaded photos will appear as <span className="font-semibold">Pending Photos</span> until an administrator approves them.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}