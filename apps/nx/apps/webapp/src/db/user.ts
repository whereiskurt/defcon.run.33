import { Entity, Service } from 'electrodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';

import { createHash, generateKeyPairSync } from 'crypto';
import * as qr from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { invalidateCache } from './cache';

const accessKeyId: string = process.env['USER_DYNAMODB_ID']!;
const secretAccessKey: string = process.env['USER_DYNAMODB_SECRET']!;
const region: string = process.env['USER_DYNAMODB_REGION']!;
const endpoint: string = process.env['USER_DYNAMODB_ENDPOINT']!;

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
    ...(region ? { region } : {}),
    ...(endpoint ? { endpoint } : {}),
  }),
  {
    marshallOptions: {
      convertEmptyValues: false,
    },
  }
);

// highlight-next-line
const table: string = process.env['USER_DYNAMODB_SINGLE_TABLE']!;

const User = new Entity(
  {
    model: {
      entity: 'User',
      version: '1',
      service: 'auth',
    },
    attributes: {
      email: {
        type: 'string',
        required: true,
      },
      id: {
        type: 'string',
        required: true,
      },
      eqr: {
        type: 'string',
      },
      seed: {
        type: 'string',
      },
      hash: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      rsapubSHA: {
        type: 'string',
      },
      rsaprivSHA: {
        type: 'string',
      },
      picture: {
        type: 'string',
      },
      profile_theme: {
        type: 'string',
      },
      profile_scope: {
        type: 'string',
      },

      mqtt_username: {
        type: 'string',
      },
      mqtt_password: {
        type: 'string',
      },
      mqtt_usertype: {
        type: ['rabbit', 'admin'] as const 
      },
      
      github_profile: {
        type: 'map',
        properties: {
          avatar_url: { type: 'string' },
          bio: { type: 'any' },
          blog: { type: 'string' },
          collaborators: { type: 'number' },
          company: { type: 'any' },
          created_at: { type: 'string' },
          disk_usage: { type: 'number' },
          email: { type: 'string' },
          events_url: { type: 'string' },
          followers: { type: 'number' },
          followers_url: { type: 'string' },
          following: { type: 'number' },
          following_url: { type: 'string' },
          gists_url: { type: 'string' },
          gravatar_id: { type: 'string' },
          hireable: { type: 'any' },
          html_url: { type: 'string' },
          id: { type: 'number' },
          location: { type: 'any' },
          login: { type: 'string' },
          name: { type: 'any' },
          node_id: { type: 'string' },
          notification_email: { type: 'any' },
          organizations_url: { type: 'string' },
          owned_private_repos: { type: 'number' },
          plan: {
            type: 'map',
            properties: {
              collaborators: { type: 'number' },
              name: { type: 'string' },
              private_repos: { type: 'number' },
              space: { type: 'number' },
            },
          },
          private_gists: { type: 'number' },
          public_gists: { type: 'number' },
          public_repos: { type: 'number' },
          received_events_url: { type: 'string' },
          repos_url: { type: 'string' },
          site_admin: { type: 'boolean' },
          starred_url: { type: 'string' },
          subscriptions_url: { type: 'string' },
          total_private_repos: { type: 'number' },
          twitter_username: { type: 'any' },
          two_factor_authentication: { type: 'boolean' },
          type: { type: 'string' },
          updated_at: { type: 'string' },
          url: { type: 'string' },
        },
      },
      discord_profile: {
        type: 'map',
        properties: {
          accent_color: { type: 'any' },
          avatar: { type: 'string' },
          avatar_decoration_data: { type: 'any' },
          banner: { type: 'any' },
          banner_color: { type: 'any' },
          clan: { type: 'any' },
          discriminator: { type: 'string' },
          email: { type: 'string' },
          flags: { type: 'number' },
          global_name: { type: 'string' },
          id: { type: 'string' },
          image_url: { type: 'string' },
          locale: { type: 'string' },
          mfa_enabled: { type: 'boolean' },
          premium_type: { type: 'number' },
          public_flags: { type: 'number' },
          username: { type: 'string' },
          verified: { type: 'boolean' },
        },
      },
      strava_profile: {
        type: 'map',
        properties: {
          badge_type_id: { type: 'number' },
          bio: { type: 'string' },
          city: { type: 'string' },
          country: { type: 'string' },
          created_at: { type: 'string' },
          firstname: { type: 'string' },
          follower: { type: 'any' },
          friend: { type: 'any' },
          id: { type: 'number' },
          lastname: { type: 'string' },
          premium: { type: 'boolean' },
          profile: { type: 'string' },
          profile_medium: { type: 'string' },
          resource_state: { type: 'number' },
          sex: { type: 'string' },
          state: { type: 'string' },
          summit: { type: 'boolean' },
          updated_at: { type: 'string' },
          username: { type: 'string' },
          weight: { type: 'number' },
        },
      },
      strava_account: {
        type: 'map',
        properties: {
          access_token: { type: 'string' },
          athlete: {
            type: 'map',
            properties: {
              badge_type_id: { type: 'number' },
              bio: { type: 'string' },
              city: { type: 'string' },
              country: { type: 'string' },
              created_at: { type: 'string' },
              firstname: { type: 'string' },
              follower: { type: 'any' },
              friend: { type: 'any' },
              id: { type: 'number' },
              lastname: { type: 'string' },
              premium: { type: 'boolean' },
              profile: { type: 'string' },
              profile_medium: { type: 'string' },
              resource_state: { type: 'number' },
              sex: { type: 'string' },
              state: { type: 'string' },
              summit: { type: 'boolean' },
              updated_at: { type: 'string' },
              username: { type: 'string' },
              weight: { type: 'number' },
            },
          },
          expires_at: { type: 'number' },
          expires_in: { type: 'number' },
          provider: { type: 'string' },
          providerAccountId: { type: 'number' },
          refresh_token: { type: 'string' },
          token_type: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
    indexes: {
      primary: {
        pk: {
          field: 'pk',
          composite: ['email'],
        },
        sk: {
          field: 'sk',
          composite: ['id'],
        },
      },
      
      byRsaPubSHA: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['hash'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['email'],
        },
      },

      byMqttUsername: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: ['mqtt_username'],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['id'],
        },
      },
    },
  },
  { client, table }
);

export { User };


export async function UpdateNodeMailer(email: string) {
  const user = await getUserOrNew(email);
  return user;
}

export async function UpdateStrava(email: string, strava_profile: any, strava_account: any) {
  const user = await getUserOrNew(email);
  if (!user) {
    throw new Error('Update Strava User not found');
  }
  const picture = user?.picture ?? strava_profile.profile_medium
  const name = user?.name ?? strava_profile.username

  const result = await User.update({
    email: email,
    id: user.id
  })
  .set({
    name,
    picture
  })
  .set(
    strava_profile
  ).set(
    strava_account
  )
  .go({
    response: 'all_new'
  });

  invalidateCache(email, 'users');
  
  return result.data;
}

export async function UpdateGithub(email: string, github_profile: any) {
  const user = await getUserOrNew(email);
  if (!user) {
    throw new Error('Update Github User not found');
  }

  const picture = user?.picture ?? github_profile.avatar_url;
  const name = user?.name ?? github_profile.name;

  const result = await User.update({
    email: email,
    id: user.id
  })
  .set({
    name,
    picture
  })
  .set(
    github_profile
  )
  .go({
    response: 'all_new'
  });
  invalidateCache(email, 'users');

  return result.data;
}

export async function UpdateDiscord(email: string, discord_profile: any) {
  const user = await getUserOrNew(email);
  if (!user) {
    throw new Error('Update DiscordL User not found');
  }

  const picture = user?.picture ?? discord_profile.image_url;
  const name = user?.name ?? discord_profile.global_name;

  const result = await User.update({
    email: email,
    id: user.id
  })
  .set({
    name,
    picture
  })
  .set(
    discord_profile
  )
  .go({
    response: 'all_new'
  });
  invalidateCache(email, 'users');

  return result.data;
}

export async function getUser(email: string) {
  const result = await User.query
    .primary({
      email: email,
    })
    .go();

  if (result.data.length > 0) {
    return result.data[0];
  }
  return null;
}

async function getUserOrNew(email: string) {
  const result = await getUser(email);
  if (result) {
    // console.log(`User found: ${JSON.stringify(result)}`);
    console.log(`User found for ${email}`);
    return result;
  }

  const id = crypto.randomUUID();

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const seed = crypto.randomBytes(16).toString('hex');
  const rsapub = publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString('base64');
  const rsapriv = privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString('base64');

  const rsapubSHA = createHash('sha256').update(`${rsapub}`).digest('hex');
  const rsaprivSHA = createHash('sha256').update(`${rsapriv}`).digest('hex');
  const hash = createHash('sha256').update(`${rsapubSHA}${seed}`).digest('hex');
  const eqr = await qr.toDataURL(`https://run.defcon.run/r?h=${hash}`, {
    errorCorrectionLevel: 'H',
    width: 300,
  });

  const profile_theme = 'dark';

  const mqttuser = createHash('sha256').update(seed).digest('hex').slice(0, 12).toLowerCase();
  const mqttpass = createHash('sha256').update(rsaprivSHA).digest('hex').slice(0, 12).toLowerCase();

  const newUser = {
    id,
    email,
    seed,
    hash,
    eqr,
    rsapubSHA,
    rsaprivSHA,
    profile_theme,
    mqtt_username: mqttuser,
    mqtt_password: mqttpass,
    mqtt_usertype: 'rabbit' as 'rabbit',
    profile_scope: 'public',
  };

  const createResult = await User.create(newUser).go();
  return createResult.data;
}
