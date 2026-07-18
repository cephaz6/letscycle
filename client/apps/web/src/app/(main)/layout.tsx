import { SiteHeader } from '@/components/layout/site-header';
import { ConditionalCategoryNav } from '@/components/layout/conditional-category-nav';
import { SiteFooter } from '@/components/layout/site-footer';

/** Marketplace chrome: header + category nav + footer around the page. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <ConditionalCategoryNav />
      <main className="w-full flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
