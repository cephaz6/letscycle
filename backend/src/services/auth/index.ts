export { AuthService, revokeAllSessions } from './auth.service.js';
export { createDummyCognito, hashDevPassword } from './cognito.dummy.js';
export { createGoogleVerifier } from './google.js';
export type {
  AuthSession,
  CognitoClient,
  GoogleProfile,
  GoogleVerifier,
  RequestMeta,
  SignupInput,
  TokenClaims,
  TokenVerifier,
} from './auth.types.js';
