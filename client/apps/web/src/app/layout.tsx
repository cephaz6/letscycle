import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import { ThemeProvider, themeInitScript } from '@letscycle/ui';
import { ApiProvider } from '@letscycle/api-client';
import { AuthProvider } from '@/features/auth';
import { ServiceWorkerRegistrar } from '@/components/pwa/service-worker';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });

export const metadata: Metadata = {
  title: 'LetsCycle',
  description:
    'Local decluttering marketplace — give away or sell items, matched to nearby people.',
};

// Mobile-first: correct viewport scaling on phones. themeColor tints the
// browser/OS chrome, and matches the manifest so an installed app is seamless.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <head>
        {/* Stamp the persisted/system theme onto <html> before paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <ApiProvider>
            <AuthProvider>
              <OfflineBanner />
              {children}
              <InstallPrompt />
            </AuthProvider>
          </ApiProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
