import Link from 'next/link';
import { Icon } from '@/components/icons';

type HeroBannerProps = {
  familyName: string;
  heroBackground?: string;
  heroOpacity?: string;
  heroPosY?: string;
};

export function HeroBanner({ familyName, heroBackground, heroOpacity, heroPosY }: HeroBannerProps) {
  const bgUrl = heroBackground ? `/api/files/${heroBackground}` : '/hero-beach.svg';
  const opacity = Math.min(100, Math.max(10, parseInt(heroOpacity || '60', 10))) / 100;
  const posY = Math.min(100, Math.max(0, parseInt(heroPosY || '50', 10)));

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navyLight to-navy p-8 text-white shadow-lift">
      {/* Background image overlay */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${bgUrl}')`, opacity, backgroundPositionY: `${posY}%` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/60 via-navy/40 to-navy/30" />
      
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          Welcome to our family archive
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
          The {familyName} Family
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/80">
          Preserving our past, cherishing our present, and building our future together.
        </p>
        
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/tree"
            className="inline-flex items-center gap-2 rounded-xl bg-navyAccent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navyAccent/90 shadow-card"
          >
            <Icon name="tree" className="h-4 w-4" />
            Explore Family Tree
          </Link>
          <Link
            href="/photos"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <Icon name="photo" className="h-4 w-4" />
            View Photos
          </Link>
        </div>
      </div>
      
      {/* Quote card */}
      <div className="absolute bottom-4 right-4 hidden sm:block">
        <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm max-w-xs">
          <p className="text-sm italic text-white/90">
            &ldquo;Family is a gift that lasts forever.&rdquo;
          </p>
          <div className="mt-2 flex items-center gap-2 text-white/60">
            <Icon name="calendar" className="h-3 w-3" />
            <span className="text-[10px]">Family Reunion 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
