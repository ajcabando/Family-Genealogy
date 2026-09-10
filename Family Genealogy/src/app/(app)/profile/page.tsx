import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Icon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function MyProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.memberId) redirect(`/family/${session.memberId}`);

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