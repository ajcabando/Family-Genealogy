import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSettings } from '@/lib/settings';
import { PwaRegister } from '@/components/pwa-register';

export const viewport: Viewport = {
  themeColor: '#faf7f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  // The database may not be reachable during `next build` (e.g. Docker), so
  // fall back to a generic title rather than failing the build.
  try {
    const settings = await getSettings();
    return {
      title: `${settings.familyName} Family Archive`,
      description: 'A private digital family heritage archive',
      applicationName: 'Family Archive',
      manifest: '/manifest.webmanifest',
      appleWebApp: {
        capable: true,
        title: 'Family Archive',
        statusBarStyle: 'default',
      },
      icons: {
        icon: '/favicon.svg',
        apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      },
    };
  } catch {
    return {
      title: 'Family Archive',
      description: 'A private digital family heritage archive',
      manifest: '/manifest.webmanifest',
      icons: {
        icon: '/favicon.svg',
        apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      },
    };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}