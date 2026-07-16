import type { ListingCondition, ListingType } from '@letscycle/api-client';

/** Integer pence → price string, or "Free" for giveaways / no price. */
export function formatPrice(
  pricePence: number | null,
  listingType?: ListingType,
): string {
  if (listingType === 'giveaway' || pricePence === null || pricePence === 0) {
    return 'Free';
  }
  return `£${(pricePence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: pricePence % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'New',
  likeNew: 'Like new',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export function formatCondition(condition: ListingCondition): string {
  return CONDITION_LABELS[condition];
}

/** Metres → "x.x km" / "xxx m", or null when distance is unknown. */
export function formatDistance(distanceMetres: number | null): string | null {
  if (distanceMetres === null) return null;
  if (distanceMetres < 1000) return `${Math.round(distanceMetres)} m`;
  return `${(distanceMetres / 1000).toFixed(1)} km`;
}

/** ISO date → "2 days ago" style relative label. */
export function formatPostedAt(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}
