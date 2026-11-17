import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ['@ancora/config', '@ancora/shared-types', '@ancora/ui'],
};

export default nextConfig;
