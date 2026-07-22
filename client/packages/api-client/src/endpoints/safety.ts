import { http } from '../http';

export type MeetPointCategory =
  'policeStation' | 'supermarket' | 'library' | 'communityCentre';

/** A verified public place to hand an item over. */
export interface MeetPoint {
  id: string;
  name: string;
  address: string;
  category: MeetPointCategory;
  location: { lat: number; lng: number };
  distanceMetres: number | null;
  openingHours: Record<string, unknown>;
  notes: string | null;
}

export interface NearbyMeetPointsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}

/** A trip to a handover, with the safety signals the traveller can raise. */
export interface SafeTransitSession {
  id: string;
  transactionId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  liveLocationShareEnabled: boolean;
  trustedContactNotified: boolean;
  arrivalConfirmedAt: string | null;
  duressTriggeredAt: string | null;
}

export interface UpdateSafeTransitInput {
  liveLocationShareEnabled?: boolean;
  trustedContactNotified?: boolean;
  confirmArrival?: boolean;
  triggerDuress?: boolean;
  end?: boolean;
}

export const safetyApi = {
  /** Verified meet points near a point, nearest first. */
  listMeetPoints(params: NearbyMeetPointsParams): Promise<MeetPoint[]> {
    return http.get<MeetPoint[]>('/meet-points', {
      query: params as unknown as Record<string, string | number | undefined>,
    });
  },

  /** Begin a safe-transit session for one of your transactions. */
  startSafeTransit(
    transactionId: string,
    input: { liveLocationShareEnabled?: boolean } = {},
  ): Promise<SafeTransitSession> {
    return http.post<SafeTransitSession>(`/transactions/${transactionId}/safe-transit`, {
      json: input,
    });
  },

  /** Toggle sharing, confirm arrival, raise duress, or end the session. */
  updateSafeTransit(
    sessionId: string,
    input: UpdateSafeTransitInput,
  ): Promise<SafeTransitSession> {
    return http.patch<SafeTransitSession>(`/safe-transit/${sessionId}`, { json: input });
  },
};
