import { API_BASE_URL } from '../config';
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
  sellerId?: string;
  listingType?: ListingType;
  keyword?: string;
  minPricePence?: number;
  maxPricePence?: number;
  sort?: ListingSort;
  limit?: number;
  offset?: number;
}

export interface CreateListingInput {
  title: string;
  description: string;
  categoryId: string;
  condition: ListingCondition;
  listingType: ListingType;
  pricePence: number | null;
  location: GeoPoint & { accuracyMetres: number };
  publish?: boolean;
}

export interface PhotoUploadRequest {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  width: number;
  height: number;
  displayOrder: number;
}

export interface PhotoUploadTicket {
  photoId: string;
  s3ObjectId: string;
  uploadUrl: string;
  expiresInSeconds: number;
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

  /** Create a listing (draft unless publish is true). Requires auth. */
  create(input: CreateListingInput): Promise<ListingDetail> {
    return http.post<ListingDetail>('/listings', { json: input });
  },

  /** Update fields or flip draft <-> active. Owner only. */
  update(
    id: string,
    input: Partial<CreateListingInput> & { status?: 'draft' | 'active' },
  ): Promise<ListingDetail> {
    return http.patch<ListingDetail>(`/listings/${id}`, { json: input });
  },

  /** Step 1 of the photo flow: reserve a slot and get a presigned URL. */
  requestPhotoUpload(
    listingId: string,
    input: PhotoUploadRequest,
  ): Promise<PhotoUploadTicket> {
    return http.post<PhotoUploadTicket>(`/listings/${listingId}/photos`, {
      json: input,
    });
  },

  /** Step 3: confirm the bytes landed so the photo becomes visible. */
  confirmPhoto(listingId: string, photoId: string): Promise<ListingDetail> {
    return http.post<ListingDetail>(
      `/listings/${listingId}/photos/${photoId}/confirm`,
    );
  },
};

/** Step 2 of the photo flow: PUT the file to the presigned URL. */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: Blob,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Photo upload failed with status ${res.status}`);
  }
}

/**
 * Resolve a photo key to a displayable URL. Demo data stores full image URLs
 * as the key; uploaded keys are served by the API's media endpoint (dev) — a
 * CDN base replaces that here when real S3 lands.
 */
export function resolveImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${API_BASE_URL}/media?key=${encodeURIComponent(key)}`;
}
