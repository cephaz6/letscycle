import { http } from '../http';

/** The signed-in user's own profile (GET /users/me). */
export interface MyProfile {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  avatarUrl: string | null;
  accountStatus: 'active' | 'suspended' | 'deleted';
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

/** Public profile (GET /users/:userId). */
export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  memberSince: string;
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

  /** A public view of another user. */
  getById(userId: string): Promise<PublicProfile> {
    return http.get<PublicProfile>(`/users/${userId}`);
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
