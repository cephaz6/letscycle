import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import { ThemeProvider, themeInitScript } from '@letscycle/ui';
import { ApiProvider } from '@letscycle/api-client';
import { SiteHeader } from '@/components/layout/site-header';
import { CategoryNav } from '@/components/layout/category-nav';
import { SiteFooter } from '@/components/layout/site-footer';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });

export const metadata: Metadata = {
  title: 'LetsCycle',
  description:
    'Local decluttering marketplace — give away or sell items, matched to nearby people.',
};

// Mobile-first: correct viewport scaling on phones.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
            <div className="flex min-h-dvh flex-col">
              <SiteHeader />
              <CategoryNav />
              <main className="w-full flex-1">{children}</main>
              <SiteFooter />
            </div>
          </ApiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
