'use client';

import { useState } from 'react';
import { UploadModal } from './upload-modal';
import { Icon } from './icons';

type MemberOption = { id: string; name: string };
type Album = { id: string; name: string };

export function EventUploader({
  albums,
  members,
  approvalRequired,
}: {
  albums: Album[];
  members: MemberOption[];
  approvalRequired: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [albumId, setAlbumId] = useState(albums[0]?.id || '');

  return (
    <>
      <div className="flex items-center gap-2">
        {albums.length > 1 && (
          <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} className="input w-44">
            {albums.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Icon name="camera" className="h-4 w-4" /> Upload photos
        </button>
      </div>
      {open && (
        <UploadModal albumId={albumId} members={members} approvalRequired={approvalRequired} open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}