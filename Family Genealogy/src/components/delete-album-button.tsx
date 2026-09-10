'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

export function DeleteAlbumButton({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!window.confirm('Delete this album and remove its photos from the reunion?')) return;
    setBusy(true);
    await fetch(`/api/reunions/albums/${albumId}`, { method: 'DELETE' });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="rounded-lg p-2 text-inkSoft/60 transition hover:bg-rust/10 hover:text-rust"
      title="Delete album"
    >
      <Icon name="trash" className="h-4 w-4" />
    </button>
  );
}