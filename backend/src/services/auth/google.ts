import { createRemoteJWKSet, jwtVerify } from 'jose';
import { UnauthorizedError } from '../../shared/errors/httpErrors.js';
import type { GoogleProfile, GoogleVerifier } from './auth.types.js';

const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

interface GoogleIdTokenClaims {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  picture?: string;
}

/**
 * Verifies Google-issued ID tokens (RS256) against Google's JWKS, checking the
 * audience matches our OAuth client ID. This is provider-native and does not
 * depend on Cognito, so it works today under the dummy auth stack.
 */
export function createGoogleVerifier(clientId: string): GoogleVerifier {
  const jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

  return {
    async verify(idToken: string): Promise<GoogleProfile> {
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: clientId,
      }).catch(() => {
        throw new UnauthorizedError('Invalid Google token');
      });

      const claims = payload as GoogleIdTokenClaims;
      if (typeof payload.sub !== 'string' || !claims.email) {
        throw new UnauthorizedError('Google token missing subject or email');
      }

      return {
        googleSub: payload.sub,
        email: claims.email,
        emailVerified: claims.email_verified === true || claims.email_verified === 'true',
        name: claims.name ?? claims.given_name ?? claims.email.split('@')[0] ?? 'Member',
        ...(claims.picture ? { pictureUrl: claims.picture } : {}),
      };
    },
  };
}
