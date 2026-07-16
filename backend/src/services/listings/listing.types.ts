import type { Uuid } from '../../shared/types/common.js';

export type ListingCondition = 'new' | 'likeNew' | 'good' | 'fair' | 'poor';
export type ListingType = 'sell' | 'giveaway';
export type ListingStatus =
  'draft' | 'active' | 'reserved' | 'completed' | 'expired' | 'removed';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ListingLocation extends GeoPoint {
  accuracyMetres: number;
}

export interface CreateListingInput {
  sellerId: Uuid;
  title: string;
  description: string;
  categoryId: Uuid;
  condition: ListingCondition;
  listingType: ListingType;
  pricePence: number | null;
  location: ListingLocation;
  deadlineAt?: Date | null;
  attributes?: Record<string, unknown>;
  // Draft by default; publishing sets publishedAt and emits listing.created.
  publish?: boolean;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  categoryId?: Uuid;
  condition?: ListingCondition;
  pricePence?: number | null;
  location?: ListingLocation;
  deadlineAt?: Date | null;
  attributes?: Record<string, unknown>;
  // draft <-> active only; other transitions are system-driven (later steps).
  status?: 'draft' | 'active';
}

export interface ListingPhotoDetail {
  id: Uuid;
  key: string;
  displayOrder: number;
  width: number;
  height: number;
}

export interface ListingDetail {
  id: Uuid;
  sellerId: Uuid;
  title: string;
  description: string;
  categoryId: Uuid;
  condition: ListingCondition;
  listingType: ListingType;
  pricePence: number | null;
  currency: string;
  location: ListingLocation;
  status: ListingStatus;
  deadlineAt: Date | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  photos: ListingPhotoDetail[];
}

export type ListingSort = 'recent' | 'distance' | 'priceAsc' | 'priceDesc' | 'relevance';

export interface SearchListingsFilters {
  categoryId?: Uuid;
  listingType?: ListingType;
  minPricePence?: number;
  maxPricePence?: number;
  keyword?: string;
  center?: GeoPoint;
  radiusKm?: number;
  sort: ListingSort;
  limit: number;
  offset: number;
}

export interface ListingSummary {
  id: Uuid;
  sellerId: Uuid;
  title: string;
  listingType: ListingType;
  condition: ListingCondition;
  pricePence: number | null;
  currency: string;
  status: ListingStatus;
  location: GeoPoint;
  distanceMetres: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  // Key of the first confirmed photo (for grid thumbnails), or null.
  coverPhotoKey: string | null;
}

export interface SearchListingsResult {
  items: ListingSummary[];
  total: number;
  limit: number;
  offset: number;
}

export type ViewSource = 'search' | 'match' | 'direct' | 'profile';

export interface CreatePhotoUploadInput {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  width: number;
  height: number;
  displayOrder: number;
}
