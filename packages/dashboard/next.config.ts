import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@claims-analyst/shared',
    '@claims-analyst/agents',
    '@claims-analyst/data',
    '@claims-analyst/graph',
  ],
  serverExternalPackages: ['better-sqlite3', 'kuzu'],
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
