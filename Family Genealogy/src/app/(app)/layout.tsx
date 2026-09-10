import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const settings = await getSettings();

  return (
    <AppShell
      session={{ name: session.name, email: session.email, role: session.role }}
      familyName={settings.familyName || 'Family'}
    >
      {children}
    </AppShell>
  );
}