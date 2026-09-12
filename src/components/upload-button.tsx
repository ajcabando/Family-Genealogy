'use client';

import { useState } from 'react';
import { UploadModal } from './upload-modal';
import { Icon } from './icons';

type MemberOption = { id: string; name: string };

export function UploadButton({
  albumId,
  members,
  approvalRequired,
  label = 'Upload photos',
}: {
  albumId?: string;
  members: MemberOption[];
  approvalRequired: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Icon name="camera" className="h-4 w-4" /> {label}
      </button>
      {open && (
        <UploadModal albumId={albumId} members={members} approvalRequired={approvalRequired} open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}