import Link from 'next/link';
import { Icon } from '@/components/icons';

export const dynamic = 'force-dynamic';

const sections = [
  {
    icon: 'home',
    title: 'Getting Started',
    desc: 'Sign in with the email and password your administrator gave you. On your phone, tap Add to Home Screen in your browser menu to install the app — it works just like a native app.',
    tip: "Don't have an account yet? Tap Request access on the sign-in page.",
    href: '/login',
    linkLabel: 'Sign in',
  },
  {
    icon: 'tree',
    title: 'Family Tree',
    desc: 'Explore your whole family across generations. Drag to move around, pinch or use +/− to zoom. Tap any person to see their details, or use the search box to jump to someone by name.',
    tip: 'On a phone, tapping a person enters Focus mode — showing just them and their closest family.',
    href: '/tree',
    linkLabel: 'Open the tree',
  },
  {
    icon: 'users',
    title: 'Family Directory',
    desc: 'Browse every family member in one place. Search by name, filter by branch, and tap anyone to open their full profile with photo, biography, and family connections.',
    tip: "Can't find someone? Ask your administrator — they can add new members.",
    href: '/family',
    linkLabel: 'Browse family',
  },
  {
    icon: 'photo',
    title: 'Photos',
    desc: 'Browse the family photo archive. Tap any photo to view it full-screen — swipe left or right to browse, pinch or double-tap to zoom. Favorite photos you love with the heart icon.',
    tip: 'Tagged family members appear below each photo — tap a name to visit their profile.',
    href: '/photos',
    linkLabel: 'Open gallery',
  },
  {
    icon: 'camera',
    title: 'Uploading Photos',
    desc: "Tap Upload Photos to share your own pictures. On your phone, you can take a photo directly or pick from your library. Add a caption, date, and tag family members who appear in the photo.",
    tip: 'If photo approval is on, your photo will appear as pending until an admin reviews it.',
    href: '/photos',
    linkLabel: 'Upload photos',
  },
  {
    icon: 'calendar',
    title: 'Reunions',
    desc: 'See past and upcoming family gatherings. Open an event to view its details, browse photo albums, and upload your own reunion memories.',
    tip: 'Albums organize reunion photos by category — like Group Photos or Family Dinner.',
    href: '/reunions',
    linkLabel: 'View reunions',
  },
  {
    icon: 'edit',
    title: 'Suggesting Corrections',
    desc: "Found something wrong or missing? Open any person's profile and tap Suggest a correction. Describe the change and submit — it enters a review queue and won't affect the official tree until an admin approves it.",
    tip: 'You can also use this to suggest adding a new family member.',
    href: '/family',
    linkLabel: 'Find a member',
  },
  {
    icon: 'bell',
    title: 'Notifications',
    desc: "The bell icon in the header alerts you when something needs your attention — a contribution approved, someone tagged you in a photo, or a new reunion announced.",
    tip: 'Check notifications regularly to stay up to date with your family archive.',
    href: '/notifications',
    linkLabel: 'View notifications',
  },
];

function GuideCard({ section }: { section: (typeof sections)[number] }) {
  return (
    <div className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-goldDeep transition group-hover:bg-gold group-hover:text-white">
          <Icon name={section.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-ink">{section.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-inkSoft">{section.desc}</p>
          {section.tip && (
            <p className="mt-3 rounded-lg bg-gold/8 px-3 py-2 text-xs text-goldDeep">
              <span className="font-semibold">Tip:</span> {section.tip}
            </p>
          )}
          <Link href={section.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-goldDeep hover:text-gold">
            {section.linkLabel} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Family Archive Guide</h1>
        <p className="mt-1 text-sm text-inkSoft">
          Quick tips for browsing, contributing, and getting the most out of your family archive.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <GuideCard key={s.title} section={s} />
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-display text-base font-bold text-ink">Need help?</h3>
        <p className="mt-1.5 text-sm text-inkSoft">
          If something isn&apos;t working or you&apos;re not sure what you&apos;re allowed to do, ask your family&apos;s administrator — they manage accounts, approvals, and settings.
        </p>
      </div>
    </div>
  );
}
