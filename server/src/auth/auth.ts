import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth' with {
  'resolution-mode': 'import',
};
import type { Pool } from 'pg';
import { getPool, isDatabaseConfigured } from '../db/pool.js';
import { claimLegacyAccount, deleteAccountData, getUser } from '../db/user-store.js';
import {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendSignInCode,
  sendVerificationEmail,
} from './email.js';
import { APPLE_ORIGIN, configuredProviders, socialProviderOptions } from './providers.js';

/**
 * Sign-in, run by Better Auth (https://better-auth.com) in this server, with
 * its sessions and accounts in the site's own Postgres. It replaced Clerk: no
 * per-user fees, no third-party script on the page, and the sign-in screens
 * are the site's own.
 *
 * Email and password always; Google, Apple and Microsoft once their keys are
 * set (see providers.ts); a code by email, password reset and address
 * confirmation once email is (see email.ts). Sessions live in an httpOnly cookie on the site's
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

/**
 * Better Auth's plugins: a sign-in code by email, where email is set up, and a
 * cookie naming the way someone last signed in, so the page can point to it.
 * Neither adds a table.
 */
export async function authPlugins(): Promise<BetterAuthPlugin[]> {
  const { emailOTP, lastLoginMethod } = await import('better-auth/plugins');
  return [
    lastLoginMethod(),
    ...(isEmailConfigured()
      ? [
          emailOTP({
            otpLength: 6,
            expiresIn: 10 * 60,
            // Stored hashed, like a password: the table never holds a usable code.
            storeOTP: 'hashed',
            sendVerificationOTP: ({ email, otp }) => sendSignInCode(email, otp),
          }),
        ]
      : []),
  ];
}

/** The configuration; auth.test.ts checks pool.ts makes the tables it needs. */
export function authOptions(pool: Pool, plugins: BetterAuthPlugin[] = []) {
  const origins = siteOrigins();
  const providers = configuredProviders();
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
    trustedOrigins: providers.includes('apple') ? [...origins, APPLE_ORIGIN] : origins,
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
            const { APIError } = await import('better-auth/api');
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
      // Google, Apple or Microsoft signs in to an account made with the same
      // address when it has confirmed that address. Google confirms every one.
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
    socialProviders: socialProviderOptions(),
    plugins,

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

/**
 * Better Auth is an ES module and this server is CommonJS, so it loads with
 * import(), never require(): Node can require() an ES module only where the
 * runtime allows it, and Vercel's did not. The require() at startup took down
 * every API route, sign-in or not. tsconfig's "module": "node16" now refuses
 * such a require at compile time.
 */
async function createAuth(pool: Pool) {
  const { betterAuth } = await import('better-auth');
  return betterAuth(authOptions(pool, await authPlugins()));
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;

let auth: Promise<Auth> | null = null;
let authPool: Pool | null = null;
let authBuiltAt = 0;

/** Remade monthly on a long-running server, well inside the Apple secret's life. */
const REBUILD_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/** The Better Auth instance, made on first use. Callers check isAuthConfigured() first. */
export function getAuth(): Promise<Auth> {
  const pool = getPool();
  // Rebuilt when the pool is (tests swap databases between files).
  if (!auth || authPool !== pool || Date.now() - authBuiltAt > REBUILD_AFTER_MS) {
    authPool = pool;
    authBuiltAt = Date.now();
    const made = createAuth(pool);
    // A failed load is not kept: the next request tries again.
    made.catch(() => {
      if (auth === made) auth = null;
    });
    auth = made;
  }
  return auth;
}

/** Test seam: rebuild from the current environment on next use. */
export function __resetAuthForTests(): void {
  auth = null;
  authPool = null;
}
