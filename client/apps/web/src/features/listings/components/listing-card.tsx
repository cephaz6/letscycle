'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ImageOff, MapPin } from 'lucide-react';
import {
  resolveImageUrl,
  useFavourites,
  useToggleFavourite,
  type ListingSummary,
} from '@letscycle/api-client';
import { Badge, cn } from '@letscycle/ui';
import { useAuth } from '@/features/auth';
import { formatCondition, formatDistance, formatPrice } from '../format';

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: favourites } = useFavourites({ enabled: isAuthenticated });
  const toggle = useToggleFavourite();

  const isFree = listing.listingType === 'giveaway' || listing.pricePence === null;
  const image = resolveImageUrl(listing.coverPhotoKey);
  const distance = formatDistance(listing.distanceMetres);
  const saved = Boolean(favourites?.items.some((l) => l.id === listing.id));

  function onHeart(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?next=/listings/${listing.id}`);
      return;
    }
    toggle.mutate({ listing, favourite: !saved });
  }

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
          aria-label={saved ? 'Remove from saved' : 'Save item'}
          aria-pressed={saved}
          onClick={onHeart}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur transition hover:bg-background"
        >
          <Heart className={cn('size-4', saved && 'fill-destructive text-destructive')} />
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
