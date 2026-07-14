export { AuthService, revokeAllSessions } from './auth.service.js';
export { createDummyCognito } from './cognito.dummy.js';
export type {
  AuthSession,
  CognitoClient,
  RequestMeta,
  SignupInput,
  TokenClaims,
  TokenVerifier,
} from './auth.types.js';
