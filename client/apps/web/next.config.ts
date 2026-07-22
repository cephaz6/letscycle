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
  outputFileTracingRoot: path.join(dirname, '../../'),
  // Workspace packages ship raw TS/TSX; Next transpiles them (no build step).
  transpilePackages: ['@letscycle/ui', '@letscycle/api-client'],
};

export default nextConfig;
