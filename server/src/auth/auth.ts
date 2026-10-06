import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import type { Pool } from 'pg';
import { getPool, isDatabaseConfigured } from '../db/pool.js';
import { claimLegacyAccount, deleteAccountData, getUser } from '../db/user-store.js';
import { isEmailConfigured, sendPasswordResetEmail, sendVerificationEmail } from './email.js';

/**
 * Sign-in, run by Better Auth (https://better-auth.com) in this server, with
 * its sessions and accounts in the site's own Postgres. It replaced Clerk: no
 * per-user fees, no third-party script on the page, and the sign-in screens
 * are the site's own.
 *
 * Email and password always; Google when GOOGLE_CLIENT_ID and
 * GOOGLE_CLIENT_SECRET are set; password reset and address confirmation when
 * email is (see email.ts). Sessions live in an httpOnly cookie on the site's
 * own domain, so the API must be served from the same origin as the site, as
 * it is on Vercel and under the Vite dev proxy.
 */

const MIN_SECRET_LENGTH = 32;

export function isAuthConfigured(): boolean {
  return (
    isDatabaseConfigured() &&
    (process.env.BETTER_AUTH_SECRET?.trim().length ?? 0) >= MIN_SECRET_LENGTH
  );
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

/** Every origin the site is served from: the configured ones, Vercel's, and dev servers. */
export function siteOrigins(): string[] {
  const vercel = (host?: string) => (host?.trim() ? `https://${host.trim()}` : undefined);
  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.SITE_URL,
    process.env.APP_ORIGIN,
    ...(process.env.ADDITIONAL_ORIGINS?.split(',') ?? []),
    vercel(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    vercel(process.env.VERCEL_BRANCH_URL),
    vercel(process.env.VERCEL_URL),
  ];
  if (process.env.NODE_ENV !== 'production') {
    candidates.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000');
  }
  const origins = new Set<string>();
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      console.warn(`[auth] ignoring malformed origin "${value}"`);
    }
  }
  return [...origins];
}

/** Better Auth's camelCase fields as snake_case columns, like the site's other tables. */
function columns(...fields: string[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field, field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)]),
  );
}

/** The configuration; auth.test.ts checks pool.ts makes the tables it needs. */
export function authOptions(pool: Pool) {
  const origins = siteOrigins();
  const email = isEmailConfigured();
  // A static URL when one is given; otherwise the request's own host, if it
  // is one of the site's (so Vercel previews work), else the main site.
  const baseURL = process.env.BETTER_AUTH_URL?.trim() || {
    allowedHosts: origins.map((origin) => new URL(origin).host),
    fallback: origins[0],
  };

  return {
    appName: 'CarInfo',
    secret: process.env.BETTER_AUTH_SECRET?.trim(),
    baseURL,
    basePath: '/api/auth',
    trustedOrigins: origins,
    database: pool,
    telemetry: { enabled: false },
    advanced: {
      // Better Auth skips its cross-site checks under test runners; the tests
      // here are of the real thing.
      disableOriginCheck: false,
      // pool.ts makes the tables and auth.test.ts checks them against Better
      // Auth's. Checking again would introspect the database at every cold
      // start, before ensureSchema() may have run.
      database: { validateSchema: false },
    },

    user: {
      modelName: 'auth_user',
      fields: columns('emailVerified', 'createdAt', 'updatedAt'),
      deleteUser: {
        enabled: true,
        // A Pro subscription would keep billing an account that no longer exists.
        beforeDelete: async (user) => {
          const account = await getUser(user.id);
          if (account?.plan === 'pro') {
            throw new APIError('BAD_REQUEST', {
              message: 'Cancel Pro under Manage billing before deleting your account.',
            });
          }
        },
        afterDelete: async (user) => {
          await deleteAccountData(user.id);
        },
      },
    },
    session: {
      modelName: 'auth_session',
      fields: columns('expiresAt', 'createdAt', 'updatedAt', 'ipAddress', 'userAgent', 'userId'),
      // Signed in for 30 days, renewed once a day by use.
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Answer most session checks from a signed cookie rather than the
      // database. A session revoked elsewhere ends within this window.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      modelName: 'auth_account',
      fields: columns(
        'accountId',
        'providerId',
        'userId',
        'accessToken',
        'refreshToken',
        'idToken',
        'accessTokenExpiresAt',
        'refreshTokenExpiresAt',
        'createdAt',
        'updatedAt',
      ),
      // Google signs in to an account made with the same, confirmed, address.
      accountLinking: { enabled: true, trustedProviders: ['google'] },
    },
    verification: {
      modelName: 'auth_verification',
      fields: columns('expiresAt', 'createdAt', 'updatedAt'),
    },
    // In the database, not memory: each serverless instance has its own
    // memory, so a guesser spread across them would get a fresh budget each.
    rateLimit: {
      enabled: process.env.DISABLE_RATE_LIMIT !== 'true',
      storage: 'database',
      modelName: 'auth_rate_limit',
      fields: columns('lastRequest'),
      // Every page asks for the session: a write per view, for a read the
      // /api limiter already bounds. Sign-in, sign-up and reset keep theirs.
      customRules: { '/get-session': false },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      ...(email
        ? { sendResetPassword: ({ user, url }) => sendPasswordResetEmail(user.email, url) }
        : {}),
    },
    ...(email
      ? {
          emailVerification: {
            sendOnSignUp: true,
            autoSignInAfterVerification: true,
            sendVerificationEmail: ({ user, url }) => sendVerificationEmail(user.email, url),
          },
        }
      : {}),
    socialProviders: isGoogleConfigured()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
            prompt: 'select_account',
          },
        }
      : {},

    // Accounts made under Clerk move to the new sign-in with the same
    // address, once it is confirmed: at sign-up through Google, or when the
    // confirmation link is followed.
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (user.emailVerified) await claimLegacyAccount(user.id, user.email);
          },
        },
        update: {
          after: async (user) => {
            if (user.emailVerified) await claimLegacyAccount(user.id, user.email);
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
}

function createAuth(pool: Pool) {
  return betterAuth(authOptions(pool));
}

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | null = null;
let authPool: Pool | null = null;

/** The Better Auth instance, made on first use. Callers check isAuthConfigured() first. */
export function getAuth(): Auth {
  const pool = getPool();
  // Rebuilt when the pool is (tests swap databases between files).
  if (!auth || authPool !== pool) {
    auth = createAuth(pool);
    authPool = pool;
  }
  return auth;
}

/** Test seam: rebuild from the current environment on next use. */
export function __resetAuthForTests(): void {
  auth = null;
  authPool = null;
}
