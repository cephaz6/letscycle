'use client';

import { useEffect } from 'react';
import {
  onSessionExpired,
  onTokensChanged,
  setTokens,
  usersApi,
} from '@letscycle/api-client';
import { useAuthStore } from './auth-store';
import { persistTokens, readStoredTokens } from './session';

/**
 * Restores the session on load, keeps localStorage in sync with token rotation,
 * and flips the store to anonymous when the session can't be refreshed.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubTokens = onTokensChanged(persistTokens);
    const unsubExpired = onSessionExpired(() => {
      useAuthStore.getState().setAnonymous();
    });

    const stored = readStoredTokens();
    if (!stored?.refreshToken) {
      useAuthStore.getState().setAnonymous();
    } else {
      setTokens({
        accessToken: stored.accessToken ?? '',
        refreshToken: stored.refreshToken,
      });
      // The http layer silently refreshes if the access token is missing/expired.
      usersApi
        .getMe()
        .then((user) => useAuthStore.getState().setUser(user))
        .catch(() => useAuthStore.getState().setAnonymous());
    }

    return () => {
      unsubTokens();
      unsubExpired();
    };
  }, []);

  return <>{children}</>;
}
