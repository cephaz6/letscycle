'use client';

import { create } from 'zustand';
import type { MyProfile } from '@letscycle/api-client';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: MyProfile | null;
  setUser: (user: MyProfile) => void;
  setAnonymous: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  setUser: (user) => set({ user, status: 'authenticated' }),
  setAnonymous: () => set({ user: null, status: 'anonymous' }),
}));
