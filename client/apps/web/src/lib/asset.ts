// Resolve a static asset path to a URL. Assets live in `public/` and are served
// from the app origin by default. To move them to a CDN / S3 bucket later, set
// NEXT_PUBLIC_ASSET_BASE_URL (e.g. https://cdn.letscycle.app) — no code changes.

const BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '').replace(/\/+$/, '');

export function assetUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}`;
}
