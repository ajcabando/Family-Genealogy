'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icons';

export function PhotoSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') || '');

  function submit(v: string) {
    const p = new URLSearchParams(params.toString());
    if (v.trim()) p.set('q', v.trim());
    else p.delete('q');
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="relative w-full sm:w-64">
      <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft/60" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit(value);
        }}
        onBlur={() => submit(value)}
        placeholder="Search in photos..."
        className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-inkSoft/60 outline-none transition focus:border-navyAccent focus:ring-2 focus:ring-navyAccent/20"
      />
    </div>
  );
}