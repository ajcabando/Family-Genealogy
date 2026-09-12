import Link from 'next/link';
import { yearsRange, photoUrl, fullName, cn } from '@/lib/utils';

type MemberCardProps = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: Date | null;
  deathDate?: Date | null;
  branch?: string | null;
  profilePhoto?: {
    thumbPath?: string | null;
    optimizedPath?: string | null;
  } | null;
};

// Branch accents stay subtle — they tint a badge, not the whole card.
const BRANCH_COLORS: Record<string, string> = {
  Cruz: 'bg-accentBlueSoft text-accentBlue',
  Reyes: 'bg-accentGreenSoft text-accentGreen',
  Santos: 'bg-accentPurpleSoft text-primary',
};

function getBranchColor(branch: string | null | undefined) {
  if (!branch) return 'bg-appBg text-subtext';
  return BRANCH_COLORS[branch] || 'bg-appBg text-subtext';
}

export function MemberCard({ id, firstName, lastName, birthDate, deathDate, branch, profilePhoto }: MemberCardProps) {
  const years = yearsRange(birthDate, deathDate);
  const name = fullName({ firstName, lastName });

  return (
    <Link
      href={`/family/${id}`}
      className="member-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-2xl"
    >
      <div className="card h-full overflow-hidden transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <div className="aspect-[4/5] overflow-hidden bg-appBg">
          <img
            src={photoUrl(profilePhoto)}
            alt={name}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]',
              deathDate && 'grayscale',
            )}
          />
        </div>
        <div className="p-3">
          <p className="truncate font-display text-sm font-bold text-ink">{name}</p>
          <p className="mt-0.5 truncate text-xs text-subtext">
            {years}
            {branch ? ` • ${branch}` : ''}
          </p>
          {branch && (
            <span className={cn('mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', getBranchColor(branch))}>
              {branch} Branch
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
