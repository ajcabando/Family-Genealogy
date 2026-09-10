import dayjs from 'dayjs';

export const SESSION_COOKIE = 'session';

export function formatDate(d?: Date | string | null, withDay = true): string {
  if (!d) return '';
  const day = dayjs(d);
  return withDay ? day.format('MMMM D, YYYY') : day.format('YYYY');
}

export function formatYear(d?: Date | string | null): string {
  return d ? dayjs(d).format('YYYY') : '';
}

export function yearsRange(birth?: Date | string | null, death?: Date | string | null): string {
  const b = formatYear(birth);
  const d = formatYear(death);
  if (b && d) return `${b} – ${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return '';
}

export function isLiving(member: { deathDate?: Date | string | null } | null | undefined): boolean {
  return !!member && !member.deathDate;
}

export function fullName(m?: { firstName?: string | null; middleName?: string | null; lastName?: string | null } | null): string {
  if (!m) return '';
  return [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ');
}

export function initials(m?: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!m) return '?';
  return `${(m.firstName || '?')[0]}${(m.lastName || '?')[0]}`.toUpperCase();
}

export function photoUrl(p?: { thumbPath?: string | null; optimizedPath?: string | null } | null, variant: 'thumb' | 'full' = 'thumb'): string {
  const rel = variant === 'thumb' ? p?.thumbPath : p?.optimizedPath ?? p?.thumbPath;
  return rel ? `/api/files/${rel}` : '';
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function formatRelative(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d, true);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function parseBool(v?: string | null): boolean {
  return v === 'true' || v === '1';
}