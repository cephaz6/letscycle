import { Suspense } from 'react';
import { Hero } from '@/components/home/hero';
import { BrowseView } from '@/features/listings/components/browse-view';

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense>
        <BrowseView />
      </Suspense>
    </>
  );
}
