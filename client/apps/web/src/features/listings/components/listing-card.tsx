'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ImageOff, MapPin } from 'lucide-react';
import { resolveImageUrl, type ListingSummary } from '@letscycle/api-client';
import { Badge, cn } from '@letscycle/ui';
import { formatCondition, formatDistance, formatPrice } from '../format';

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const [liked, setLiked] = useState(false);
  const isFree = listing.listingType === 'giveaway' || listing.pricePence === null;
  const image = resolveImageUrl(listing.coverPhotoKey);
  const distance = formatDistance(listing.distanceMetres);

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote demo photos
          <img
            src={image}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}

        {isFree && (
          <Badge variant="success" className="absolute left-2 top-2 shadow-sm">
            Free
          </Badge>
        )}

        <button
          type="button"
          aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={liked}
          onClick={(e) => {
            e.preventDefault();
            setLiked((v) => !v);
          }}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur transition hover:bg-background"
        >
          <Heart className={cn('size-4', liked && 'fill-destructive text-destructive')} />
        </button>
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="text-base font-bold tracking-tight">
          {formatPrice(listing.pricePence, listing.listingType)}
        </p>
        <h3 className="line-clamp-1 text-sm text-foreground/90">{listing.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {distance && (
            <>
              <MapPin className="size-3" />
              {distance} ·{' '}
            </>
          )}
          {formatCondition(listing.condition)}
        </p>
      </div>
    </Link>
  );
}
