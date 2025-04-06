module.exports = ({ env }) => ({
    upload: {
      config: {
        provider: 'aws-s3',
        providerOptions: {
          baseUrl: env('CF_CDN_URL'),
          rootPath: env('CF_ROOT_PATH'),
          s3Options: {
            credentials: {
              accessKeyId: env('CF_ACCESS_KEY'),
              secretAccessKey: env('CF_SECRET_KEY'),
            },
            region: env('AWS_REGION'),
            params: {
              ACL: null,
              signedUrlExpires: env('AWS_SIGNED_URL_EXPIRES', 15 * 60),
              Bucket: env('CF_BUCKET_NAME'),
            },
          },
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      }
    //   ,
    //   config: {
    //     provider: 'local',
    //     sizeLimit: 2500000, //2.5MB
    //   }
    },
    email: {
      config: {
        provider: 'amazon-ses',
        providerOptions: {
          key: env('SES_ACCESS_KEY'),
          secret: env('SES_SECRET_KEY'),
          amazon: env('SES_EMAIL_URI'),
        },
        settings: {
          defaultFrom:  env('SES_FROM_ADDRESS'), // 'strapi@email.defcon.run',
          defaultReplyTo: env('SES_REPLYTO_ADDRESS'), //'strapi@email.defcon.run',
        },
      }
    }
  });

////////
//SES_FROM_ADDRESS
//SES_REPLYTO_ADDRESS