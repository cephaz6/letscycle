'use client';

import { useCallback } from 'react';
import { authApi, usersApi } from '@letscycle/api-client';
import { useAuthStore } from './auth-store';

/** Read the current auth status/user. */
export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  return { status, user, isAuthenticated: status === 'authenticated' };
}

/**
 * Finish sign-in after a successful auth mutation (login/signup/google): the
 * tokens are already set by the api-client, so fetch the profile and mark
 * authenticated. Returns the loaded profile.
 */
export function useCompleteSignIn() {
  const setUser = useAuthStore((s) => s.setUser);
  return useCallback(async () => {
    const profile = await usersApi.getMe();
    setUser(profile);
    return profile;
  }, [setUser]);
}

/** Sign out: revoke the refresh token and reset local state. */
export function useSignOut() {
  const setAnonymous = useAuthStore((s) => s.setAnonymous);
  return useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAnonymous();
    }
  }, [setAnonymous]);
}
