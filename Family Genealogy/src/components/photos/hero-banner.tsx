import { Icon } from '@/components/icons';

type PhotosHeroProps = {
  totalPhotos: number;
  totalAlbums: number;
  contributors: number;
  /** Button rendered on the right side of the banner (e.g. upload button). */
  action?: React.ReactNode;
  /** Custom hero background image path (stored in settings). */
  heroBackground?: string;
  /** Background image opacity (0-100). */
  heroOpacity?: string;
  /** Background image vertical position (0-100). */
  heroPosY?: string;
};

export function PhotosHeroBanner({ totalPhotos, totalAlbums, contributors, action, heroBackground, heroOpacity, heroPosY }: PhotosHeroProps) {
  const bgUrl = heroBackground ? `/api/files/${heroBackground}` : '/hero-beach.svg';
  const opacity = Math.min(100, Math.max(10, parseInt(heroOpacity || '60', 10))) / 100;
  const posY = Math.min(100, Math.max(0, parseInt(heroPosY || '50', 10)));

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navyLight to-navy text-white shadow-lift">
      {/* Photographic background */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${bgUrl}')`, opacity, backgroundPositionY: `${posY}%` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/60 via-navy/40 to-navy/30" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6 p-7 sm:p-9">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <Icon name="photo" className="h-4 w-4" />
            Family Photos
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Our Family Memories</h1>
          <p className="mt-3 text-sm text-white/80">Photos capture moments, but the memories last forever.</p>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold">{totalPhotos}</p>
              <p className="text-xs text-white/60">Total Photos</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="font-display text-3xl font-bold">{totalAlbums}</p>
              <p className="text-xs text-white/60">Albums</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="font-display text-3xl font-bold">{contributors}</p>
              <p className="text-xs text-white/60">Contributors</p>
            </div>
          </div>
        </div>

        {action}
      </div>
    </div>
  );
}