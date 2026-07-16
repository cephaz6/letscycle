import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a minimal Docker runtime image.
  output: 'standalone',
  // Trace files from the monorepo root so workspace deps are included.
  outputFileTracingRoot: path.join(dirname, '../../'),
  // Workspace packages ship raw TS/TSX; Next transpiles them (no build step).
  transpilePackages: ['@letscycle/ui', '@letscycle/api-client'],
};

export default nextConfig;
