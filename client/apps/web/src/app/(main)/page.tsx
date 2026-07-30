import { Suspense } from 'react';
import { Hero } from '@/components/home/hero';
import { BrowseView } from '@/features/listings/components/browse-view';
import { RecentlyViewed } from '@/features/listings/components/recently-viewed';

export default function Home() {
  return (
    <>
      <Hero />
      <RecentlyViewed />
      <Suspense>
        <BrowseView />
      </Suspense>
    </>
  );
}
