import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSettings } from '@/lib/settings';

export const viewport: Viewport = {
  themeColor: '#faf7f1',
};

export async function generateMetadata(): Promise<Metadata> {
  // The database may not be reachable during `next build` (e.g. Docker), so
  // fall back to a generic title rather than failing the build.
  try {
    const settings = await getSettings();
    return {
      title: `${settings.familyName} Family Archive`,
      description: 'A private digital family heritage archive',
      icons: { icon: '/favicon.svg' },
    };
  } catch {
    return {
      title: 'Family Archive',
      description: 'A private digital family heritage archive',
      icons: { icon: '/favicon.svg' },
    };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}