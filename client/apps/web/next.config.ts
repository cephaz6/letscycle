import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TS/TSX; Next transpiles them (no build step).
  transpilePackages: ['@letscycle/ui', '@letscycle/api-client'],
};

export default nextConfig;
