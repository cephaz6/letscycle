import { API_BASE_URL, MEDIA_BASE_URL } from '../config';
import { http } from '../http';

export type ListingCondition = 'new' | 'likeNew' | 'good' | 'fair' | 'poor';
export type ListingType = 'sell' | 'giveaway';
export type ListingStatus =
  'draft' | 'active' | 'reserved' | 'completed' | 'expired' | 'removed';

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

export type ListingSort = 'recent' | 'distance' | 'priceAsc' | 'priceDesc' | 'relevance';

export interface SearchListingsParams {
  categoryId?: string;
  sellerId?: string;
  listingType?: ListingType;
  keyword?: string;
  minPricePence?: number;
  maxPricePence?: number;
  sort?: ListingSort;
  /** Centre point for distance filtering/sorting. lat and lng go together. */
  lat?: number;
  lng?: number;
  radiusKm?: number;
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
  /** Form-post providers (Cloudinary) set these; a plain PUT ticket omits them. */
  method?: 'PUT' | 'POST';
  fields?: Record<string, string>;
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

  /** The signed-in user's saved (favourited) listings. */
  listFavourites(): Promise<SearchListingsResult> {
    return http.get<SearchListingsResult>('/favourites');
  },

  /** Save a listing to favourites. */
  favourite(id: string): Promise<void> {
    return http.post<void>(`/listings/${id}/favourite`);
  },

  /** Remove a listing from favourites. */
  unfavourite(id: string): Promise<void> {
    return http.delete<void>(`/listings/${id}/favourite`);
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

  /** Soft-remove a listing (sets status to "removed"). Owner only. */
  remove(id: string): Promise<void> {
    return http.delete<void>(`/listings/${id}`);
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
    return http.post<ListingDetail>(`/listings/${listingId}/photos/${photoId}/confirm`);
  },
};

/**
 * Step 2 of the photo flow: send the bytes straight to the storage provider.
 *
 * Two shapes, decided by the server: a plain PUT of the raw file (S3 presigned
 * PUT and the local dev store), or a multipart POST with signed fields
 * (Cloudinary). Accepts either a ticket or a bare URL so existing PUT callers
 * keep working unchanged.
 */
export async function uploadToPresignedUrl(
  ticket: string | Pick<PhotoUploadTicket, 'uploadUrl' | 'method' | 'fields'>,
  file: Blob,
): Promise<void> {
  const upload = typeof ticket === 'string' ? { uploadUrl: ticket } : ticket;

  const res =
    upload.method === 'POST' && upload.fields
      ? await fetch(upload.uploadUrl, {
          method: 'POST',
          // No Content-Type header: the browser must set the multipart boundary.
          body: toFormData(upload.fields, file),
        })
      : await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

  if (!res.ok) {
    throw new Error(`Photo upload failed with status ${res.status}`);
  }
}

function toFormData(fields: Record<string, string>, file: Blob): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  // Appended last: some providers require the file after its signed fields.
  form.append('file', file);
  return form;
}

/**
 * Resolve a photo key to a displayable URL. Demo data stores full image URLs
 * as the key; uploaded keys are served by the API's media endpoint (dev) — a
 * CDN base replaces that here when real S3 lands.
 */
export function resolveImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  // Demo/seed rows store whole URLs.
  if (key.startsWith('http')) return key;
  // A CDN prefix serves the file directly; the stored key doubles as its path,
  // minus the extension the provider appends itself.
  if (MEDIA_BASE_URL) {
    return `${MEDIA_BASE_URL}/${key.replace(/\.[^./]+$/, '')}`;
  }
  return `${API_BASE_URL}/media?key=${encodeURIComponent(key)}`;
}

/**
 * Pass a `resolveImageUrl` result here before handing it to next/image's
 * `unoptimized` prop.
 *
 * The dev media store is served by the backend container over the browser's
 * API_BASE_URL (typically localhost:3000 in docker compose). next/image's
 * server-side optimizer fetches that URL itself, but it runs inside the *web*
 * container — where "localhost" means itself, not the sibling backend — so
 * the fetch fails. Real remote hosts (the Unsplash demo photos, Cloudinary in
 * production) are actual internet hosts reachable identically from both the
 * browser and the server, so only this one dev-only source needs to skip
 * optimization; nothing production-facing is affected.
 */
export function isUnoptimizableImageUrl(url: string): boolean {
  return url.includes('/media?key=');
}
