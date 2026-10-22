import { createPrivateKey, sign } from 'node:crypto';

/**
 * The accounts people can sign in with besides an email: Google, Apple and
 * Microsoft, between them the addresses most Canadians have (Gmail, iCloud,
 * Outlook and Hotmail). Each is offered once its keys are set on the server.
 * All three say whether they have confirmed the address, which is what lets
 * one sign in to an account first made with a password. Facebook is left out:
 * it seldom does, so its sign-ins could not join an existing account.
 */
export type SignInProvider = 'google' | 'apple' | 'microsoft';

const env = (name: string) => process.env[name]?.trim() || undefined;

/** Apple's client secret is a token we sign; it may last at most six months. */
const APPLE_SECRET_DAYS = 150;

function base64url(data: Buffer | string): string {
  return Buffer.from(data).toString('base64url');
}

/**
 * The client secret Apple asks for: a JWT signed with the key from Apple's
 * developer site (APPLE_PRIVATE_KEY, the .p8 file's text; APPLE_KEY_ID; and
 * APPLE_TEAM_ID), for the Services ID in APPLE_CLIENT_ID. Made here so it
 * never has to be renewed by hand. APPLE_CLIENT_SECRET, when set, is used as
 * it is instead.
 */
export function appleClientSecret(now = Date.now()): string | undefined {
  const given = env('APPLE_CLIENT_SECRET');
  if (given) return given;
  const clientId = env('APPLE_CLIENT_ID');
  const teamId = env('APPLE_TEAM_ID');
  const keyId = env('APPLE_KEY_ID');
  // Hosts that keep one line per variable store the key's line breaks as \n.
  const pem = env('APPLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!clientId || !teamId || !keyId || !pem) return undefined;
  const iat = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64url(
    JSON.stringify({
      iss: teamId,
      iat,
      exp: iat + APPLE_SECRET_DAYS * 24 * 60 * 60,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    }),
  );
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(pem),
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${payload}.${base64url(signature)}`;
}

/**
 * Apple's secret, or nothing where its keys are missing or the key will not
 * load: a mistyped key turns off the Apple button, not every sign-in.
 */
function safeAppleSecret(): string | undefined {
  try {
    return appleClientSecret();
  } catch (err) {
    console.warn('[auth] Apple sign-in is off: APPLE_PRIVATE_KEY did not load.', err);
    return undefined;
  }
}

/** The providers whose keys are set, in the order the buttons show. */
export function configuredProviders(): SignInProvider[] {
  const on: SignInProvider[] = [];
  if (env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')) on.push('google');
  if (env('APPLE_CLIENT_ID') && safeAppleSecret()) on.push('apple');
  if (env('MICROSOFT_CLIENT_ID') && env('MICROSOFT_CLIENT_SECRET')) on.push('microsoft');
  return on;
}

/** Better Auth's socialProviders for the configured ones. */
export function socialProviderOptions() {
  const on = new Set(configuredProviders());
  const apple = on.has('apple') ? safeAppleSecret() : undefined;
  return {
    ...(on.has('google')
      ? {
          google: {
            clientId: env('GOOGLE_CLIENT_ID')!,
            clientSecret: env('GOOGLE_CLIENT_SECRET')!,
            prompt: 'select_account' as const,
          },
        }
      : {}),
    ...(apple ? { apple: { clientId: env('APPLE_CLIENT_ID')!, clientSecret: apple } } : {}),
    ...(on.has('microsoft')
      ? {
          microsoft: {
            clientId: env('MICROSOFT_CLIENT_ID')!,
            clientSecret: env('MICROSOFT_CLIENT_SECRET')!,
            // Personal accounts (Outlook, Hotmail, Live) and work or school ones.
            tenantId: 'common',
            prompt: 'select_account' as const,
          },
        }
      : {}),
  };
}

/** Apple returns its sign-ins as a form posted from its own site. */
export const APPLE_ORIGIN = 'https://appleid.apple.com';
