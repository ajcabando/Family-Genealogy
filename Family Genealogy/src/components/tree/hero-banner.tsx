import { Icon } from '@/components/icons';
import { FindMemberCard, type FindMemberOption } from './find-member-card';

type TreeHeroProps = {
  familyName: string;
  memberCount: number;
  generationCount: number;
  branchCount: number;
  members: FindMemberOption[];
  branches: string[];
  heroBackground?: string;
  heroOpacity?: string;
  heroPosY?: string;
};

export function TreeHeroBanner({ familyName, memberCount, generationCount, branchCount, members, branches, heroBackground, heroOpacity, heroPosY }: TreeHeroProps) {
  const bgUrl = heroBackground ? `/api/files/${heroBackground}` : '/hero-landscape.svg';
  const opacity = Math.min(100, Math.max(10, parseInt(heroOpacity || '60', 10))) / 100;
  const posY = Math.min(100, Math.max(0, parseInt(heroPosY || '50', 10)));

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-navy via-navyLight to-navy text-white shadow-lift">
      {/* Photographic background */}
      <div className="absolute inset-0 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url('${bgUrl}')`, opacity, backgroundPositionY: `${posY}%` }} />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-navy/60 via-navy/40 to-navy/20" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6 p-7 sm:p-9">
        <div className="max-w-lg">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <Icon name="tree" className="h-4 w-4" />
            Family Tree
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">The {familyName} Family Tree</h1>
          <p className="mt-3 text-sm text-white/80">Explore our family connections across generations.</p>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold">{memberCount}</p>
              <p className="text-xs text-white/60">Family Members</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="font-display text-3xl font-bold">{generationCount}</p>
              <p className="text-xs text-white/60">Generations</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="font-display text-3xl font-bold">{branchCount}</p>
              <p className="text-xs text-white/60">Family Branches</p>
            </div>
          </div>
        </div>

        <FindMemberCard members={members} branches={branches} generations={generationCount} />
      </div>
    </div>
  );
}