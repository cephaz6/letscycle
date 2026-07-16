'use client';

import { useState } from 'react';
import { Heart, MapPin } from 'lucide-react';
import { Badge, cn } from '@letscycle/ui';
import { formatPrice, type MockListing } from '../mock-listings';

export function ListingCard({ listing }: { listing: MockListing }) {
  const [liked, setLiked] = useState(false);
  const isFree = listing.pricePence === 0;

  return (
    <article className="group cursor-pointer">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote demo photos; next/image lands with the real listings API */}
        <img
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {isFree && (
          <Badge variant="success" className="absolute left-2 top-2 shadow-sm">
            Free
          </Badge>
        )}

        <button
          type="button"
          aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur transition hover:bg-background"
        >
          <Heart
            className={cn('size-4', liked && 'fill-destructive text-destructive')}
          />
        </button>
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="text-base font-bold tracking-tight">
          {formatPrice(listing.pricePence)}
        </p>
        <h3 className="line-clamp-1 text-sm text-foreground/90">{listing.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          {listing.distanceKm} km · {listing.condition}
        </p>
      </div>
    </article>
  );
}
