//@ts-check
const WEBAPP_ORIGIN = process.env.WEBAPP_ORIGIN || 'use1.run.defcon.run';
const WEBAPP_PREFIX = process.env.WEBAPP_PREFIX || 'www';

const { composePlugins, withNx } = require('@nx/next');
const plugins = [withNx];

// Shared configuration for both environments
const sharedConfig = {
  nx: { svgr: false },
  images: {
    remotePatterns: [new URL(`https://*.defcon.run/**`)],
  },
  async redirects() {
    return [
      {
        source: '/meshtk',
        destination: 'https://github.com/whereiskurt/meshtk',
        permanent: true,
      },
      {
        source: '/mqtt',
        destination: 'https://mqq.defcon.run/map/',
        permanent: true,
      },
      {
        source: '/q',
        destination: '/qr',
        permanent: true,
      },
      {
        source: '/photos',
        destination: '/photo',
        permanent: true,
      },
      {
        source: '/route-list',
        destination: '/routes-list',
        permanent: true,
      },
    ];
  },
};

// Production-specific configuration
const productionConfig = {
  ...sharedConfig,
  output: 'standalone',
  assetPrefix: `https://${WEBAPP_ORIGIN}/${WEBAPP_PREFIX}`, // rewrites <script> / <link> tags
  webpack(config) {
    config.output.publicPath = `https://${WEBAPP_ORIGIN}/${WEBAPP_PREFIX}/_next/`;
    return config;
  },
};

// Export the appropriate configuration based on environment
module.exports = composePlugins(...plugins)(
  process.env.NODE_ENV === 'production' ? productionConfig : sharedConfig
);
