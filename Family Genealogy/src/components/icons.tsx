import { cn } from '@/lib/utils';

const PATHS: Record<string, string> = {
  tree: 'M12 5v6M9 9l3-2 3 2M7 14c0-2 2-3 5-3s5 1 5 3m-10 2v3m10-3v3M4 20h16M12 2a2 2 0 100 4 2 2 0 000-4zM9 8a2 2 0 100 4 2 2 0 000-4zM15 8a2 2 0 100 4 2 2 0 000-4z',
  users: 'M17 20h5v-1a4 4 0 00-3-3.87M9 20H2v-1a4 4 0 013-3.87M14 3.13a4 4 0 010 7.75M12 12a4 4 0 10-8 0M16 12a4 4 0 014 4M14 20h6v-1a4 4 0 00-3-3.87',
  photo: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M14 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4m8-4v4M8 14h4m-4 4h8',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 3',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a8 8 0 0116 0v1',
  inbox: 'M4 13l3-8h10l3 8v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5zM4 13h5l1.5 2.5h3L15 13h5',
  shield: 'M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3zM9 12l2 2 4-4',
  bell: 'M6 8a6 6 0 0112 0c0 7 2 8 2 8H4s2-1 2-8M10 20a2 2 0 004 0',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.35-4.35',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
  heart: 'M12 21s-7-4.5-9.5-9C1 9 3 5 6.5 5 9 5 12 7.5 12 7.5S15 5 17.5 5C21 5 23 9 20.5 12c-2.5 4.5-8.5 9-8.5 9z',
  camera: 'M4 7h3l2-2h6l2 2h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zM12 17a4 4 0 100-8 4 4 0 000 8z',
  mapPin: 'M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  check: 'M5 12l5 5L20 7',
  trash: 'M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13h8l1-13M10 11v6m4-6v6',
  edit: 'M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3zM13.5 6.5l3 3',
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 20h16',
  home: 'M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5',
  link: 'M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5',
  filter: 'M3 5h18l-7 8v5l-4 2v-7L3 5z',
  zoomIn: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.35-4.35M8 11h6M11 8v6',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z',
  userPlus: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6m-3-3h6',
  menu: 'M3 6h18M3 12h18M3 18h18',
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5 shrink-0', className)}
      aria-hidden="true"
    >
      <path d={PATHS[name] || PATHS.sparkle} />
    </svg>
  );
}