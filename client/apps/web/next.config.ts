import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a minimal Docker runtime image — but never
  // on Vercel, which packages the app with its own build output. Standalone
  // there produces a server Vercel doesn't expect and the file trace ends up
  // requiring a Next runtime that was never emitted.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  // Trace files from the monorepo root so workspace deps are included.
  //
  // Two different roots, because the two build environments have different
  // filesystems: Docker's build context is `client/` only (no parent — the git
  // repo root doesn't exist inside that image), so tracing must stop there.
  // Vercel, with "include files outside the root directory" on, uploads the
  // whole git repo (client/ *and* backend/ as siblings) and repackages traced
  // functions relative to that top level. Telling Next to trace from `client/`
  // there made Vercel's own repackaging silently drop the `client/` segment —
  // "/vercel/path0/apps/web/noop.js" instead of ".../client/apps/web/noop.js"
  // — which is the exact "Cannot find module next-server/server.runtime.prod.js"
  // failure this fixes.
  outputFileTracingRoot: path.join(dirname, process.env.VERCEL ? '../../../' : '../../'),
  // Workspace packages ship raw TS/TSX; Next transpiles them (no build step).
  transpilePackages: ['@letscycle/ui', '@letscycle/api-client'],
};

export default nextConfig;
