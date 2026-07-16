'use client';

import { useListings } from '@letscycle/api-client';
import { ListingCard } from './listing-card';

export function RelatedListings({
  categoryId,
  excludeId,
}: {
  categoryId: string;
  excludeId: string;
}) {
  const { data } = useListings({ categoryId, limit: 6 });
  const items = (data?.items ?? []).filter((l) => l.id !== excludeId).slice(0, 5);

  if (items.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="mb-4 text-lg font-bold tracking-tight">More in this category</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
