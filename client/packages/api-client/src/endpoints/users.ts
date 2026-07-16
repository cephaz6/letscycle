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

export const usersApi = {
  /** Current user's profile (requires a valid session). */
  getMe(): Promise<MyProfile> {
    return http.get<MyProfile>('/users/me');
  },
};
