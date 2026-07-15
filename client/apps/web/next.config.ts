import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace UI package ships raw TS/TSX; Next transpiles it (no build step).
  transpilePackages: ['@letscycle/ui'],
};

export default nextConfig;
