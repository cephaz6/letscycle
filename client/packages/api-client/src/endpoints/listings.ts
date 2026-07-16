import { http } from '../http';

export type ListingCondition = 'new' | 'likeNew' | 'good' | 'fair' | 'poor';
export type ListingType = 'sell' | 'giveaway';
export type ListingStatus =
  | 'draft'
  | 'active'
  | 'reserved'
  | 'completed'
  | 'expired'
  | 'removed';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Grid/summary shape from GET /listings. Dates are ISO strings over the wire. */
export interface ListingSummary {
  id: string;
  sellerId: string;
  title: string;
  listingType: ListingType;
  condition: ListingCondition;
  pricePence: number | null;
  currency: string;
  status: ListingStatus;
  location: GeoPoint;
  distanceMetres: number | null;
  publishedAt: string | null;
  createdAt: string;
  coverPhotoKey: string | null;
}

export interface ListingPhoto {
  id: string;
  key: string;
  displayOrder: number;
  width: number;
  height: number;
}

/** Full shape from GET /listings/:id. */
export interface ListingDetail {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  categoryId: string;
  condition: ListingCondition;
  listingType: ListingType;
  pricePence: number | null;
  currency: string;
  location: GeoPoint & { accuracyMetres: number };
  status: ListingStatus;
  deadlineAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  photos: ListingPhoto[];
}

export interface SearchListingsResult {
  items: ListingSummary[];
  total: number;
  limit: number;
  offset: number;
}

export type ListingSort =
  | 'recent'
  | 'distance'
  | 'priceAsc'
  | 'priceDesc'
  | 'relevance';

export interface SearchListingsParams {
  categoryId?: string;
  listingType?: ListingType;
  keyword?: string;
  minPricePence?: number;
  maxPricePence?: number;
  sort?: ListingSort;
  limit?: number;
  offset?: number;
}

export const listingsApi = {
  /** Public search/browse. */
  search(params: SearchListingsParams = {}): Promise<SearchListingsResult> {
    return http.get<SearchListingsResult>('/listings', {
      auth: false,
      query: params as Record<string, string | number | undefined>,
    });
  },

  /** Public listing detail. */
  getById(id: string): Promise<ListingDetail> {
    return http.get<ListingDetail>(`/listings/${id}`, { auth: false });
  },
};

/**
 * Resolve a photo key to a displayable URL. Demo data stores full image URLs as
 * the key; real S3 keys will be prefixed with a CDN base here later.
 */
export function resolveImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return key.startsWith('http') ? key : key;
}
