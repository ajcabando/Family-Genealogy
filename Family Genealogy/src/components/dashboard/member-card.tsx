import Link from 'next/link';
import { yearsRange, photoUrl, fullName } from '@/lib/utils';

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

const BRANCH_COLORS: Record<string, string> = {
  'Cruz': 'bg-blue-100 text-blue-700',
  'Reyes': 'bg-green-100 text-green-700',
  'Santos': 'bg-purple-100 text-purple-700',
};

function getBranchColor(branch: string | null | undefined) {
  if (!branch) return 'bg-gray-100 text-gray-700';
  return BRANCH_COLORS[branch] || 'bg-gray-100 text-gray-700';
}

export function MemberCard({ id, firstName, lastName, birthDate, deathDate, branch, profilePhoto }: MemberCardProps) {
  const years = yearsRange(birthDate, deathDate);
  const name = fullName({ firstName, lastName });
  
  return (
    <Link href={`/family/${id}`} className="member-card group">
      <div className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
        <div className="aspect-square overflow-hidden bg-parchment">
          <img
            src={photoUrl(profilePhoto)}
            alt={name}
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${deathDate ? 'grayscale' : ''}`}
          />
        </div>
        <div className="p-3">
          <p className="font-display text-sm font-bold text-ink truncate">{name}</p>
          <p className="text-xs text-inkSoft mt-0.5">
            {years && `b. ${birthDate?.getFullYear()}`}
            {years && branch && ' • '}
            {branch || 'Cebu'}
          </p>
          {branch && (
            <span className={`inline-block mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getBranchColor(branch)}`}>
              {branch} Branch
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
