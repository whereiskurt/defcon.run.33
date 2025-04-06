export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          "script-src": [
            "'self'",
            "unsafe-inline",
            "*.basemaps.cartocdn.com",
          ],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            `*.defcon.run`,
            "*.basemaps.cartocdn.com",
            "tile.openstreetmap.org",
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            `*.defcon.run`,
            "*.basemaps.cartocdn.com",
            "tile.openstreetmap.org",
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::remove-headers'
];