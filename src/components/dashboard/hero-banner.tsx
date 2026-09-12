import Link from 'next/link';
import { Icon } from '@/components/icons';

type HeroBannerProps = {
  familyName: string;
  heroBackground?: string;
  heroOpacity?: string;
  heroPosY?: string;
};

export function HeroBanner({ familyName, heroBackground, heroOpacity, heroPosY }: HeroBannerProps) {
  // Falls back to the bundled beach artwork when an admin hasn't picked a hero photo.
  const bgUrl = heroBackground ? `/api/files/${heroBackground}` : '/hero-beach.svg';
  const opacity = Math.min(100, Math.max(10, parseInt(heroOpacity || '60', 10))) / 100;
  const posY = Math.min(100, Math.max(0, parseInt(heroPosY || '50', 10)));

  return (
    <section className="relative overflow-hidden rounded-3xl bg-navyDeep text-white shadow-lift">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')`, opacity, backgroundPositionY: `${posY}%` }}
      />
      {/* Dark gradient so the headline keeps contrast over any photograph. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-tr from-navyDeep/95 via-navyDeep/70 to-primary/45" />

      <div className="relative z-10 flex min-h-[300px] flex-col justify-end p-6 sm:min-h-[360px] sm:p-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accentGold">
          Welcome to our family archive
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          The {familyName} Family
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
          Preserving our past, cherishing our present, and building our future together.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/tree"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Icon name="tree" className="h-4 w-4" />
            Explore Family Tree
          </Link>
          <Link
            href="/photos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Icon name="photo" className="h-4 w-4" />
            View Photos
          </Link>
        </div>
      </div>
    </section>
  );
}
