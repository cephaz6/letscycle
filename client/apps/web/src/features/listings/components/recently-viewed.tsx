'use client';

import { useRecentlyViewed } from '@letscycle/api-client';
import { useAuth } from '@/features/auth';
import { ListingCard } from './listing-card';

/** A signed-in user's own browsing history — hidden entirely for signed-out
 *  visitors and once there's nothing to show, rather than an empty section. */
export function RecentlyViewed() {
  const { isAuthenticated } = useAuth();
  const { data } = useRecentlyViewed({ enabled: isAuthenticated });
  const items = data ?? [];

  if (!isAuthenticated || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-lg font-bold tracking-tight">Recently viewed</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
