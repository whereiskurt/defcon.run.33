//@ts-check
const WEBAPP_ORIGIN_BUCKET = process.env.WEBAPP_ORIGIN_BUCKET || 'use1.webapp.defcon.run';
const WEBAPP_PREFIX = process.env.WEBAPP_PREFIX || 'www';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/

const nextConfig = {
  nx: { svgr: false },

  output: 'standalone',
  assetPrefix: `https://${WEBAPP_ORIGIN_BUCKET}/${WEBAPP_PREFIX}`, // rewrites <script> / <link> tags
  webpack(config) {
    config.output.publicPath = `https://${WEBAPP_ORIGIN_BUCKET}/${WEBAPP_PREFIX}/_next/`;
    return config;
  }
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
