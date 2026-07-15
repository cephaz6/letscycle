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
