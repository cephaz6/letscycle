import type { Uuid } from '../../shared/types/common.js';

export type UserId = Uuid;

export interface CreateUserInput {
  email: string;
  displayName: string;
  cognitoSub: string;
}

// Internal account view used by auth (build step 4).
export interface UserAccount {
  id: UserId;
  email: string;
  displayName: string;
  cognitoSub: string;
  accountStatus: 'active' | 'suspended' | 'deleted';
}

// Approximate home location. The point is stored as geography(Point, 4326)
// and the accuracy as a separate column; the API presents them as one object
// since accuracy is meaningless without the point (privacy — general PRD).
export interface HomeLocation {
  lat: number;
  lng: number;
  accuracyMetres: number;
}

// User-owned settings. Kept deliberately open-ended: individual modules
// (notifications, matching) read the keys they care about.
export interface UserPreferences {
  defaultDistanceKm?: number;
  notificationDefaults?: Record<string, boolean>;
}

// Full private view — everything the owner may see about themselves.
export interface MyProfile {
  id: UserId;
  email: string;
  phone: string | null;
  displayName: string;
  avatarUrl: string | null;
  homeLocation: HomeLocation | null;
  accountStatus: 'active' | 'suspended' | 'deleted';
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Safe public view — no PII (email, phone, exact location) ever leaves here.
export interface PublicProfile {
  id: UserId;
  displayName: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  memberSince: Date;
}

// Partial: only the keys present are changed. Email is owned by Cognito and
// accountStatus by moderation — neither is updatable here.
export interface UpdateProfileInput {
  displayName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  homeLocation?: HomeLocation | null;
  preferences?: UserPreferences;
}
