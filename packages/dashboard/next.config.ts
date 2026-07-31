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
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        'better-sqlite3',
        'kuzu',
      ];
    }
    return config;
  },
};

export default nextConfig;
