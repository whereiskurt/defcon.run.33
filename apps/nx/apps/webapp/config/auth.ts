import { DynamoDBAdapter } from '@auth/dynamodb-adapter';
import { DynamoDB, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import type { Provider } from 'next-auth/providers';

import { createTransport } from 'nodemailer';

import NextAuth, { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      theme: string;
      hasStrava: boolean;
    } & DefaultSession['user'];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string;
    stravaId: string;
    theme: string;
  }
}

import '@auth/core/jwt'; // Import the module augmentation
import Email from '@auth/core/providers/nodemailer';

import Discord from 'next-auth/providers/discord';
import Github from 'next-auth/providers/github';
import Strava from 'next-auth/providers/strava';
import {
  UpdateDiscord,
  UpdateGithub,
  UpdateNodeMailer,
  UpdateStrava,
} from '@db/user';

const endpoint: string = process.env['USER_DYNAMODB_ENDPOINT']!;

const config: DynamoDBClientConfig = {
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
  region: process.env.AUTH_DYNAMODB_REGION,
  ...(endpoint ? { endpoint } : {}),
};
const client = DynamoDBDocument.from(new DynamoDB(config), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});
const adapter = DynamoDBAdapter(client, {
  tableName: process.env.AUTH_DYNAMODB_DBNAME,
});
const providers: Provider[] = [
  Email({
    server: {
      url: process.env.AUTH_SMTP_URL || '',
      ses: true,
    },
    from: process.env.AUTH_SMTP_FROM,
    async sendVerificationRequest({
      identifier: email,
      url,
      provider: { server, from },
      theme,
    }) {
      const { host, searchParams: params } = new URL(url);

      const token = params.get('token')!;

      const transport = createTransport(server);
      await transport.sendMail({
        from,
        to: email,
        subject: `${token}`, //this subject value enables click through on iOS!
        html: signupHTML({
          url,
          host,
          theme,
          email: email.replace('+', '%2B'),
          token,
        }),
        text: signupText({ url }),
      });
    },
    async generateVerificationToken() {
      const alphabet = '0123456789';
      return `${randomString(3, alphabet)}${randomString(3, alphabet)}`;
    },
  }),
  Github({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    allowDangerousEmailAccountLinking: true,
    checks: ['none'],
  }),
  Strava({
    clientId: process.env.AUTH_STRAVA_CLIENT_ID,
    clientSecret: process.env.AUTH_STRAVA_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    authorization: { params: { scope: 'activity:read' } }, //Allows public and follower content
    checks: ['none'],
  }),
  Discord({
    clientId: process.env.AUTH_DISCORD_CLIENT_ID,
    clientSecret: process.env.AUTH_DISCORD_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    checks: ['none'],
  }),
];

const randomString = (length: number, alphabet: string): string =>
  Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');

const cookieDomain =
  process.env.NODE_ENV === 'production' ? '.defcon.run' : 'localhost';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // debug: true,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 15 * 24 * 60 * 60, // 15 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  theme: {
    colorScheme: 'dark',
  },
  secret: process.env.AUTH_SECRET?.split(','),
  providers,
  adapter,
  pages: {
    signIn: '/login/auth',
    verifyRequest: '/login/verify',
  },
  callbacks: {
    signIn({ user, profile, account }) {
      const emails = process.env.AUTH_ALLOWED_EMAILS?.split(',');
      const email = user?.email ?? profile?.email!;
      //Strava is not a login provider, but rather linking.
      //NOTE: Strava has no email by design.
      if (
        account?.provider === 'strava' ||
        !emails ||
        emails[0] === '' ||
        emails[0] === 'all' ||
        emails?.includes(email)
      ) {
        return true;
      }

      console.log(
        `SECURITY: Blocked email address ${email!} from login ${JSON.stringify(
          emails
        )}.`
      );
      return false;
    },

    async jwt({ token, account, profile, trigger, session }) {
      if (trigger === 'update') {
        token.theme = session.user.theme;
        token.stravaId = session.user.hasStrava;
      } else if (account && profile) {
        if (account.provider === 'discord') {
          token.name = `${profile.global_name}`;
          token.picture = `${profile.image_url}`;
          UpdateDiscord(token.email!, { discord_profile: profile });
        } else if (account.provider === 'github') {
          token.name = `${profile.login}`;
          token.picture = `${profile.avatar_url}`;
          UpdateGithub(token.email!, { github_profile: profile });
        } else if (account.provider === 'strava') {
          token.stravaId = `${profile.id}`;
          token.name = `${profile.username}`;
          token.picture = `${profile.profile_medium}`;

          UpdateStrava(
            token.email!,
            { strava_profile: profile },
            { strava_account: account }
          );
        }
      } else if (account && account.provider === 'nodemailer') {
        UpdateNodeMailer(token.email!);
      }
      return token;
    },

    session({ session, token }) {
      session.user.hasStrava = token.stravaId ? true : (false as boolean);
      session.user.theme = token.theme as string;
      session.user.name = token.name as string;
      session.user.id = token.userId as string;
      session.user.email = token.email as string;

      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: 'sess',
      options: {
        domain: cookieDomain,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
      },
    },
    csrfToken: {
      name: 'csrf',
      options: {
        domain: cookieDomain,
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: true,
      },
    },
    callbackUrl: {
      name: 'callback',
      options: {
        domain: cookieDomain,
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: true,
      },
    },
  },
});

export function signupHTML(params: {
  url: any;
  host: any;
  theme: any;
  email: string;
  token: string;
}) {
  const { host, theme, token, email } = params;
  const url = `${process.env.NEXTAUTH_URL}/api/auth/callback/nodemailer?token=${token}&email=${email}&callbackUrl=/dashboard`;
  const escapedHost = host.replace(/\./g, '&#8203;.');

  const brandColor = '#686EA0';
  const color = {
    background: '#f9f9f9',
    text: '#444',
    mainBackground: '#fff',
    buttonBackground: brandColor,
    buttonBorder: brandColor,
    buttonText: theme.buttonText || '#fff',
  };

  return `
  <body style="background: ${color.background};">
    <table width="100%" border="0" cellspacing="10" cellpadding="0"
      style="background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;">
      <tr>
        <td align="center"
          style="padding: 0px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
          <strong>DEFCON.run</strong>
        </td>
      </tr>
      <tr>
        <td align="center"
          style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
          To complete your sign-in click:
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 0px 0;">
          <table border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}"><a href="${url}"
                  target="_blank"
                  style="font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 50px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">🚀 Sign-in</a></td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td align="center"
          style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
          <p>Or! Copy & paste this one time code into app:</p><p style="font-size: 22px;"><strong>${token}</strong></p>
        </td>
      </tr>

      <tr>
        <td align="center"
          style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
          If you did not request this email you can safely ignore it.
        </td>
      </tr>
    </table>
  </body>
  `;
}
export function signupText(params: { url: any }) {
  const { url } = params;
  return `Complete your sign in to DEFCON.run with this URL:\n${url}\n\n`;
}
