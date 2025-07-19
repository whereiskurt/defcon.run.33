//@ts-check
const WEBAPP_ORIGIN = process.env.WEBAPP_ORIGIN || 'use1.run.defcon.run';
const WEBAPP_PREFIX = process.env.WEBAPP_PREFIX || 'www';

const { composePlugins, withNx } = require('@nx/next');
const plugins = [withNx];

if (process.env.NODE_ENV === 'production') {
  module.exports = composePlugins(...plugins)({
    nx: { svgr: false },
    output: 'standalone',
    assetPrefix: `https://${WEBAPP_ORIGIN}/${WEBAPP_PREFIX}`, // rewrites <script> / <link> tags
    webpack(config) {
      config.output.publicPath = `https://${WEBAPP_ORIGIN}/${WEBAPP_PREFIX}/_next/`;
      return config;
    },
    images: {
      remotePatterns: [new URL(`https://*.defcon.run/**`)],
    },
  });
} else {
  module.exports = composePlugins(...plugins)({
    nx: { svgr: false },
    images: {
      remotePatterns: [new URL(`https://*.defcon.run/**`)],
    },
  });
}
