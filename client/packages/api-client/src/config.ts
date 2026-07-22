/**
 * Base URL for the LetsCycle API, including the version prefix.
 *
 * Resolved from `NEXT_PUBLIC_API_BASE_URL` (inlined at build time by Next), so
 * the same client works in the browser and in a future React Native app that
 * sets the variable differently. Falls back to the local backend in dev.
 */
export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/+$/, '');

/**
 * Base URL uploaded images are served from — a CDN delivery prefix such as
 * `https://res.cloudinary.com/<cloud>/image/upload`.
 *
 * Empty in local development, where the API's own media endpoint serves the
 * files instead. Stored keys are provider-agnostic, so switching providers is a
 * change of this variable rather than a data migration.
 */
export const MEDIA_BASE_URL: string = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? ''
).replace(/\/+$/, '');
