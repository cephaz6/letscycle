import type { Uuid } from '../../shared/types/common.js';

export type MeetPointCategory =
  'policeStation' | 'supermarket' | 'library' | 'communityCentre';

export interface MeetPoint {
  id: Uuid;
  name: string;
  address: string;
  category: MeetPointCategory;
  location: { lat: number; lng: number };
  distanceMetres: number | null;
  openingHours: Record<string, unknown>;
  notes: string | null;
}

export interface NearbyMeetPointsFilters {
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
}

export interface SafeTransitSession {
  id: Uuid;
  transactionId: Uuid;
  userId: Uuid;
  startedAt: Date;
  endedAt: Date | null;
  liveLocationShareEnabled: boolean;
  trustedContactNotified: boolean;
  arrivalConfirmedAt: Date | null;
  duressTriggeredAt: Date | null;
}

// Values may be explicitly undefined to match Zod's partial() output under
// exactOptionalPropertyTypes.
export interface StartSafeTransitInput {
  liveLocationShareEnabled?: boolean | undefined;
}

export interface UpdateSafeTransitInput {
  liveLocationShareEnabled?: boolean | undefined;
  trustedContactNotified?: boolean | undefined;
  confirmArrival?: boolean | undefined;
  triggerDuress?: boolean | undefined;
  end?: boolean | undefined;
}
