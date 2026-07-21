import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SearchView } from '@/features/listings/components/search-view';

export const metadata: Metadata = {
  title: 'Search · LetsCycle',
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
