import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The archive is publicly viewable — session may be null. Only editing
  // features (and admin pages) require an account.
  const session = await getSession();
  const settings = await getSettings();

  return (
    <AppShell
      session={session ? { name: session.name, email: session.email, role: session.role } : null}
      familyName={settings.familyName || 'Family'}
      sidebarBackground={settings.sidebarBackground}
      sidebarOpacity={settings.sidebarBackgroundOpacity}
      sidebarPosY={settings.sidebarBackgroundPosY}
    >
      {children}
    </AppShell>
  );
}