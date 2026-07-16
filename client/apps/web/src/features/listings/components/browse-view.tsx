import { MOCK_LISTINGS } from '../mock-listings';
import { ListingCard } from './listing-card';

export function BrowseView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-xl font-bold tracking-tight">
        Near you in Liverpool
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {MOCK_LISTINGS.length} items
        </span>
      </h1>

      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {MOCK_LISTINGS.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
