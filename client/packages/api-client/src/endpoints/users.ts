import { http } from '../http';

/** User-owned settings. Open-ended: features read the keys they care about. */
export interface UserPreferences {
  defaultDistanceKm?: number;
  notificationDefaults?: Record<string, boolean>;
}

/** The signed-in user's own profile (GET /users/me). */
export interface MyProfile {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  accountStatus: 'active' | 'suspended' | 'deleted';
  emailVerifiedAt: string | null;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  preferences?: UserPreferences;
}

/** Headline numbers shown on a member's public profile. */
export interface PublicProfileStats {
  listingsCount: number;
  salesCount: number;
  reviewsCount: number;
  averageRating: number | null;
}

/** Public profile (GET /users/:userId). */
export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isEmailVerified: boolean;
  memberSince: string;
  stats: PublicProfileStats;
}

export const usersApi = {
  /** Current user's profile (requires a valid session). */
  getMe(): Promise<MyProfile> {
    return http.get<MyProfile>('/users/me');
  },

  /** Update the current user's editable fields. */
  updateMe(input: UpdateProfileInput): Promise<MyProfile> {
    return http.patch<MyProfile>('/users/me', { json: input });
  },

  /** A public view of another user. No auth required — anyone can view. */
  getById(userId: string): Promise<PublicProfile> {
    return http.get<PublicProfile>(`/users/${userId}`, { auth: false });
  },

  /** GDPR data export (JSON of everything we hold on the user). */
  exportMyData(): Promise<unknown> {
    return http.get<unknown>('/users/me/export');
  },

  /** GDPR erasure — permanently deletes the account. */
  deleteMe(): Promise<void> {
    return http.delete<void>('/users/me');
  },
};
