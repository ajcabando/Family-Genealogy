import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/icons';
import { cn, formatDate, photoUrl, plural } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Tab = 'profile' | 'contributions' | 'settings';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'profile', label: 'My Profile' },
  { key: 'contributions', label: 'My Contributions' },
  { key: 'settings', label: 'Settings' },
];

export default async function MyProfilePage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const tab: Tab = searchParams.tab === 'contributions' ? 'contributions' : searchParams.tab === 'settings' ? 'settings' : 'profile';

  if (!session.memberId) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-goldDeep">
          <Icon name="user" className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">Your account isn&apos;t linked to a family member yet</h1>
        <p className="mt-2 text-sm text-inkSoft">
          Ask an administrator to link your account to your family profile so you can view and update it here.
        </p>
        <Link href="/family" className="btn-primary mt-4">Browse the family directory</Link>
      </div>
    );
  }

  const [member, memberCount, photoCount, contributionCount, myPhotos] = await Promise.all([
    prisma.familyMember.findUnique({
      where: { id: session.memberId },
      include: { profilePhoto: { select: { thumbPath: true, optimizedPath: true } } },
    }),
    prisma.familyMember.count({ where: { deletedAt: null } }),
    prisma.photo.count({ where: { uploadedById: session.memberId, deletedAt: null } }),
    prisma.changeRequest.count({ where: { submittedById: session.id } }),
    prisma.photo.findMany({
      where: { uploadedById: session.memberId, deletedAt: null },
      select: { id: true, caption: true, thumbPath: true, optimizedPath: true, photoDate: true, approvalStatus: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  if (!member) redirect('/family');

  const initial = (session.name || session.email || '?').slice(0, 1).toUpperCase();
  const displayName = session.name || `${member.firstName} ${member.lastName}`;

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">My Profile</h1>
      </div>

      {/* Profile banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navyLight to-navy text-white shadow-lift">
        <div className="absolute inset-0 bg-[url('/hero-beach.svg')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-navy/70 to-navy/40" />
        <div className="relative z-10 flex flex-wrap items-center gap-6 p-7 sm:p-9">
          {member.profilePhoto ? (
            <img src={photoUrl(member.profilePhoto, 'full')} alt={displayName} className="h-24 w-24 rounded-full border-4 border-white/30 object-cover shadow-lift" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 font-display text-4xl font-bold text-white">{initial}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Family Archive Profile</p>
            <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{displayName}</h2>
            <p className="mt-0.5 text-sm text-white/70">
              {session.role === 'ADMIN' ? 'Administrator' : 'Family Member'}
              {member.occupation ? ` · ${member.occupation}` : ''}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <div>
                <p className="font-display text-2xl font-bold">{memberCount}</p>
                <p className="text-xs text-white/60">Family Members</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="font-display text-2xl font-bold">{photoCount}</p>
                <p className="text-xs text-white/60">Photos Added</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="font-display text-2xl font-bold">{contributionCount}</p>
                <p className="text-xs text-white/60">Contributions</p>
              </div>
            </div>
          </div>
          <Link href={`/family/${member.id}`} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink shadow-card transition hover:bg-navyAccent hover:text-white">
            View Member Profile
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/profile${t.key === 'profile' ? '' : `?tab=${t.key}`}`}
            className={cn('pill shrink-0', tab === t.key ? 'pill-active' : 'pill-inactive')}
            aria-current={tab === t.key ? 'page' : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'profile' && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">My photos</h2>
            <Link href="/photos" className="text-xs font-semibold text-navyAccent hover:underline">Open gallery</Link>
          </div>
          {myPhotos.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-10 text-center">
              <Icon name="camera" className="h-8 w-8 text-inkSoft/40" />
              <p className="text-sm text-inkSoft">You haven&apos;t uploaded any photos yet.</p>
              <Link href="/photos" className="btn-primary mt-1">Upload photos</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {myPhotos.map((p) => (
                <Link key={p.id} href={`/photos?photo=${p.id}`} className="group relative aspect-square overflow-hidden rounded-2xl border border-line/60 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                  <img src={photoUrl(p, 'full')} alt={p.caption || 'Photo'} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-2.5 pt-8">
                    {p.caption && <p className="line-clamp-1 text-xs font-bold text-white">{p.caption}</p>}
                    <p className="text-[10px] text-white/80">{p.photoDate ? formatDate(p.photoDate) : ''}</p>
                  </div>
                  {p.approvalStatus !== 'APPROVED' && (
                    <span className={cn('absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white', p.approvalStatus === 'PENDING' ? 'bg-orange-500' : 'bg-rust')}>
                      {p.approvalStatus.toLowerCase()}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'contributions' && (
        <div className="card flex items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navyAccent/10 text-navyAccent">
              <Icon name="inbox" className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-ink">My Contributions</p>
              <p className="text-sm text-inkSoft">{plural(contributionCount, 'submission')} — corrections, new members, and photos you&apos;ve shared.</p>
            </div>
          </div>
          <Link href="/contributions" className="btn-primary shrink-0">View all</Link>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card max-w-xl divide-y divide-line/60">
          {[
            { label: 'Account email', value: session.email || '—' },
            { label: 'Role', value: session.role === 'ADMIN' ? 'Administrator' : 'Family Member' },
            { label: 'Linked family member', value: `${member.firstName} ${member.lastName}` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-xs font-semibold text-inkSoft">{row.label}</span>
              <span className="text-sm font-semibold text-ink">{row.value}</span>
            </div>
          ))}
          <div className="px-5 py-4">
            <Link href={`/family/${member.id}?suggest=1`} className="btn-ghost w-full">
              <Icon name="edit" className="h-4 w-4" /> Suggest a correction to my profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}