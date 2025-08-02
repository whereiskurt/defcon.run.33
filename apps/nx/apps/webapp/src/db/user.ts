import { Entity, Service } from 'electrodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';

import { createHash, generateKeyPairSync } from 'crypto';
import * as qr from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { invalidateCache } from './cache';
import { Accomplishments } from './accomplishment';
import { act } from 'react';

const accessKeyId: string = process.env['USER_DYNAMODB_ID']!;
const secretAccessKey: string = process.env['USER_DYNAMODB_SECRET']!;
const region: string = process.env['USER_DYNAMODB_REGION']!;
const endpoint: string = process.env['USER_DYNAMODB_ENDPOINT']!;

const creationSeed: string = process.env['USER_CREATION_SEED']!;

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
      displayname: {
        type: 'string',
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
        type: ['rabbit', 'admin'] as const,
      },

      totalAccomplishmentType: {
        type: 'map',
        properties: {
          activity: { type: 'number' },
          social: { type: 'number' },
          meshctf: { type: 'number' },
        },
        default: () => ({ activity: 0, social: 0, meshctf: 0 }),
      },

      totalPoints: {
        type: 'number',
        default: () => 0,
      },

      totalAccomplishmentYear: {
        type: 'any',
        default: () => ({}),
      },

      createdAt: {
        type: 'number',
        default: () => Date.now(),
        readOnly: true,
      },

      updatedAt: {
        type: 'number',
        watch: '*',
        set: () => Date.now(),
        readOnly: true,
      },

      github_profile: {
        type: 'map',
        properties: {
          avatar_url: { type: 'any' },
          bio: { type: 'any' },
          blog: { type: 'any' },
          collaborators: { type: 'any' },
          company: { type: 'any' },
          created_at: { type: 'any' },
          disk_usage: { type: 'any' },
          email: { type: 'any' },
          events_url: { type: 'any' },
          followers: { type: 'any' },
          followers_url: { type: 'any' },
          following: { type: 'any' },
          following_url: { type: 'any' },
          gists_url: { type: 'any' },
          gravatar_id: { type: 'any' },
          hireable: { type: 'any' },
          html_url: { type: 'any' },
          id: { type: 'any' },
          location: { type: 'any' },
          login: { type: 'any' },
          name: { type: 'any' },
          node_id: { type: 'any' },
          notification_email: { type: 'any' },
          organizations_url: { type: 'any' },
          owned_private_repos: { type: 'any' },
          plan: {
            type: 'map',
            properties: {
              collaborators: { type: 'any' },
              name: { type: 'any' },
              private_repos: { type: 'any' },
              space: { type: 'any' },
            },
          },
          private_gists: { type: 'any' },
          public_gists: { type: 'any' },
          public_repos: { type: 'any' },
          received_events_url: { type: 'any' },
          repos_url: { type: 'any' },
          site_admin: { type: 'any' },
          starred_url: { type: 'any' },
          subscriptions_url: { type: 'any' },
          total_private_repos: { type: 'any' },
          twitter_username: { type: 'any' },
          two_factor_authentication: { type: 'any' },
          type: { type: 'any' },
          updated_at: { type: 'any' },
          url: { type: 'any' },
        },
      },
      discord_profile: {
        type: 'map',
        properties: {
          accent_color: { type: 'any' },
          avatar: { type: 'any' },
          avatar_decoration_data: { type: 'any' },
          banner: { type: 'any' },
          banner_color: { type: 'any' },
          clan: { type: 'any' },
          discriminator: { type: 'any' },
          email: { type: 'any' },
          flags: { type: 'any' },
          global_name: { type: 'any' },
          id: { type: 'any' },
          image_url: { type: 'any' },
          locale: { type: 'any' },
          mfa_enabled: { type: 'any' },
          premium_type: { type: 'any' },
          public_flags: { type: 'any' },
          username: { type: 'any' },
          verified: { type: 'any' },
        },
      },
      strava_profile: {
        type: 'map',
        properties: {
          badge_type_id: { type: 'any' },
          bio: { type: 'any' },
          city: { type: 'any' },
          country: { type: 'any' },
          created_at: { type: 'any' },
          firstname: { type: 'any' },
          follower: { type: 'any' },
          friend: { type: 'any' },
          id: { type: 'any' },
          lastname: { type: 'any' },
          premium: { type: 'any' },
          profile: { type: 'any' },
          profile_medium: { type: 'any' },
          resource_state: { type: 'any' },
          sex: { type: 'any' },
          state: { type: 'any' },
          summit: { type: 'any' },
          updated_at: { type: 'any' },
          username: { type: 'any' },
          weight: { type: 'any' },
        },
      },
      strava_account: {
        type: 'map',
        properties: {
          access_token: { type: 'string' },
          athlete: {
            type: 'map',
            properties: {
              badge_type_id: { type: 'any' },
              bio: { type: 'any' },
              city: { type: 'any' },
              country: { type: 'any' },
              created_at: { type: 'any' },
              firstname: { type: 'any' },
              follower: { type: 'any' },
              friend: { type: 'any' },
              id: { type: 'any' },
              lastname: { type: 'any' },
              premium: { type: 'any' },
              profile: { type: 'any' },
              profile_medium: { type: 'any' },
              resource_state: { type: 'any' },
              sex: { type: 'any' },
              state: { type: 'any' },
              summit: { type: 'any' },
              updated_at: { type: 'any' },
              username: { type: 'any' },
              weight: { type: 'any' },
            },
          },
          expires_at: { type: 'number' },
          expires_in: { type: 'number' },
          provider: { type: 'string' },
          providerAccountId: { type: 'number' },
          refresh_token: { type: 'string' },
          token_type: { type: 'string' },
          type: { type: 'string' },
          activities: { type: 'any' }, // Map of activity_id -> StravaActivity
          last_activities_sync: { type: 'number' }, // Timestamp of last sync
          sync_history: { type: 'any' }, // Array of sync timestamps for rate limiting
          historical_sync_completed: { type: 'boolean' }, // Flag for first-time full historical sync
        },
      },
      manual_upload_counts: {
        type: 'any',
        default: () => ({}),
        // Structure: { "2025_day1": 2, "2025_day2": 1, "2024_day1": 0, ... }
        // Format: "{year}_{dayKey}" -> count
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

export async function UpdateStrava(
  email: string,
  strava_profile: any,
  strava_account: any
) {
  const user = await getUserOrNew(email);
  if (!user) {
    throw new Error('Update Strava User not found');
  }
  const picture = user?.picture ?? strava_profile.profile_medium;
  const name = user?.name ?? strava_profile.username;

  const result = await User.update({
    email: email,
    id: user.id,
  })
    .set({
      name,
      picture,
    })
    .set(strava_profile)
    .set(strava_account)
    .go({
      response: 'all_new',
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
    id: user.id,
  })
    .set({
      name,
      picture,
    })
    .set(github_profile)
    .go({
      response: 'all_new',
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
    id: user.id,
  })
    .set({
      name,
      picture,
    })
    .set(discord_profile)
    .go({
      response: 'all_new',
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
    return result;
  }

  const id = crypto.randomUUID();
  const displayname = `rabbit_${id.slice(0, 4)}`;

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

  const mqttuser = createHash('sha256')
    .update(email + creationSeed)
    .digest('hex')
    .slice(0, 12)
    .toLowerCase();

  const mqttpass = createHash('sha256')
    .update(mqttuser + creationSeed)
    .digest('hex')
    .slice(0, 12)
    .toLowerCase();

  const newUser = {
    id,
    email,
    displayname,
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

export async function UpdateUserAccomplishmentCounts(
  email: string,
  type: 'activity' | 'social' | 'meshctf',
  year: number,
  increment: boolean = true,
  points: number = 0
) {
  const user = await getUser(email);
  if (!user) {
    throw new Error('User not found for accomplishment count update');
  }

  const delta = increment ? 1 : -1;
  const pointsDelta = increment ? points : -points;

  const currentTypeCounts = user.totalAccomplishmentType || {
    activity: 0,
    social: 0,
    meshctf: 0,
  };
  const currentYearCounts = user.totalAccomplishmentYear || {};
  const currentTotalPoints = user.totalPoints || 0;

  const updatedTypeCounts = {
    ...currentTypeCounts,
    [type]: Math.max(0, (currentTypeCounts[type] || 0) + delta),
  };

  const updatedYearCounts = {
    ...currentYearCounts,
    [year.toString()]: Math.max(
      0,
      (currentYearCounts[year.toString()] || 0) + delta
    ),
  };

  const updatedTotalPoints = Math.max(0, currentTotalPoints + pointsDelta);

  const result = await User.update({
    email: email,
    id: user.id,
  })
    .set({
      totalAccomplishmentType: updatedTypeCounts,
      totalAccomplishmentYear: updatedYearCounts,
      totalPoints: updatedTotalPoints,
    })
    .go({
      response: 'all_new',
    });

  invalidateCache(email, 'users');
  return result.data;
}

export async function updateDisplayname(email: string, displayname: string) {
  const user = await getUser(email);
  if (!user) {
    throw new Error('User not found for displayname update');
  }

  const result = await User.update({
    email: email,
    id: user.id,
  })
    .set({
      displayname: displayname.trim(),
    })
    .go({
      response: 'all_new',
    });

  invalidateCache(email, 'users');
  return result.data;
}

export async function getAllUsersWithAccomplishmentCounts() {
  const result = await User.scan.go();
  
  // Get all users with their latest accomplishment
  const usersWithLatest = await Promise.all(result.data.map(async (user) => {
    // Get user's latest accomplishment
    let latestAccomplishment = null;
    try {
      const accomplishments = await Accomplishments.query.primary({ userId: user.id })
        .go();
      
      if (accomplishments.data.length > 0) {
        // Find the most recent accomplishment by completedAt
        const latest = accomplishments.data.reduce((prev, current) => 
          (current.completedAt > prev.completedAt) ? current : prev
        );
        latestAccomplishment = latest.completedAt;
      }
    } catch (error) {
      console.error(`Error fetching accomplishments for user ${user.id}:`, error);
    }

    return {
      id: user.id,
      displayname: user.displayname || `rabbit_${user.id.slice(0, 4)}`,
      email: user.email,
      totalAccomplishmentType: user.totalAccomplishmentType || { activity: 0, social: 0, meshctf: 0 },
      totalAccomplishments: (user.totalAccomplishmentType?.activity || 0) + 
                           (user.totalAccomplishmentType?.social || 0) + 
                           (user.totalAccomplishmentType?.meshctf || 0),
      totalPoints: user.totalPoints || 0,
      latestAccomplishment,
      createdAt: user.createdAt || Date.now()
    };
  }));

  // Sort by total points first, then by total accomplishments, then by most recent accomplishment, then by account creation date
  return usersWithLatest.sort((a, b) => {
    // First sort by total points (descending)
    if (a.totalPoints !== b.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // If points are equal, sort by total accomplishment count (descending)  
    if (a.totalAccomplishments !== b.totalAccomplishments) {
      return b.totalAccomplishments - a.totalAccomplishments;
    }
    // If counts are equal, sort by most recent accomplishment (newest first)
    const aLatest = a.latestAccomplishment || 0;
    const bLatest = b.latestAccomplishment || 0;
    if (aLatest !== bLatest) {
      return bLatest - aLatest;
    }
    // Finally, if everything else is equal, sort by account creation date (older accounts first)
    return a.createdAt - b.createdAt;
  });
}
