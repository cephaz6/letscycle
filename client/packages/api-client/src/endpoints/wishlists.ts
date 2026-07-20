import { http } from '../http';

export type ListingTypePreference = 'sell' | 'giveaway' | 'both';
export type WishlistItemStatus = 'active' | 'paused' | 'fulfilled' | 'expired';

/**
 * A "want" — criteria the matcher uses to alert the user when a new listing is
 * posted nearby. Distinct from favourites (saved existing listings). Dates are
 * ISO strings over the wire.
 */
export interface WishlistItem {
  id: string;
  userId: string;
  categoryId: string | null;
  keywords: string[];
  maxPricePence: number | null;
  maxDistanceKm: number;
  listingTypePreference: ListingTypePreference;
  status: WishlistItemStatus;
  expiresAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWishlistItemInput {
  categoryId?: string | null;
  keywords?: string[];
  maxPricePence?: number | null;
  maxDistanceKm: number;
  listingTypePreference?: ListingTypePreference;
  expiresAt?: string | null;
}

export interface UpdateWishlistItemInput {
  categoryId?: string | null;
  keywords?: string[];
  maxPricePence?: number | null;
  maxDistanceKm?: number;
  listingTypePreference?: ListingTypePreference;
  status?: 'active' | 'paused';
  expiresAt?: string | null;
}

export const wishlistsApi = {
  /** The signed-in user's wants (newest first). */
  list(): Promise<WishlistItem[]> {
    return http.get<WishlistItem[]>('/wishlists');
  },

  create(input: CreateWishlistItemInput): Promise<WishlistItem> {
    return http.post<WishlistItem>('/wishlists', { json: input });
  },

  update(id: string, input: UpdateWishlistItemInput): Promise<WishlistItem> {
    return http.patch<WishlistItem>(`/wishlists/${id}`, { json: input });
  },

  remove(id: string): Promise<void> {
    return http.delete<void>(`/wishlists/${id}`);
  },
};
