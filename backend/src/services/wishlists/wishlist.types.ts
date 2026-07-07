import type { Uuid } from '../../shared/types/common.js';

export type ListingTypePreference = 'sell' | 'giveaway' | 'both';
export type WishlistItemStatus = 'active' | 'paused' | 'fulfilled' | 'expired';

export interface CreateWishlistItemInput {
  userId: Uuid;
  categoryId?: Uuid | null;
  keywords?: string[];
  maxPricePence?: number | null;
  maxDistanceKm: number;
  listingTypePreference?: ListingTypePreference;
  expiresAt?: Date | null;
}

export interface UpdateWishlistItemInput {
  categoryId?: Uuid | null;
  keywords?: string[];
  maxPricePence?: number | null;
  maxDistanceKm?: number;
  listingTypePreference?: ListingTypePreference;
  // active <-> paused only; fulfilled/expired are system-driven (later steps).
  status?: 'active' | 'paused';
  expiresAt?: Date | null;
}

export interface WishlistItem {
  id: Uuid;
  userId: Uuid;
  categoryId: Uuid | null;
  keywords: string[];
  maxPricePence: number | null;
  maxDistanceKm: number;
  listingTypePreference: ListingTypePreference;
  status: WishlistItemStatus;
  expiresAt: Date | null;
  fulfilledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
