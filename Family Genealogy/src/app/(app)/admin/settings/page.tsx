import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { SettingsForm, BackupSection } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const settings = await getSettings();
  const familyName = settings.familyName || 'Family';

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Settings &amp; Backup</h1>
        <p className="mt-1 text-sm text-inkSoft">System preferences, privacy controls, and archive backup tools.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsForm settings={settings} familyName={familyName} />
        <BackupSection />
      </div>
    </div>
  );
}