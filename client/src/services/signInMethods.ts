import { authClient } from './authClient';

/** The accounts the server can sign in with, once their keys are set. */
export type SignInProvider = 'google' | 'apple' | 'microsoft';

export const PROVIDER_NAMES: Record<SignInProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  microsoft: 'Microsoft',
};

/**
 * How this browser last signed in: a provider, 'email' (a password) or
 * 'email-otp' (a code), from a cookie the server sets. Null when unknown.
 */
export function lastSignInMethod(): string | null {
  try {
    return authClient.getLastUsedLoginMethod();
  } catch {
    return null;
  }
}

/**
 * Off to the provider; back to `next` when done, or to `returnTo` with
 * ?via= naming the provider when it could not finish.
 */
export function signInWith(provider: SignInProvider, next: string, returnTo: string) {
  const join = returnTo.includes('?') ? '&' : '?';
  return authClient.signIn.social({
    provider,
    callbackURL: next,
    errorCallbackURL: `${returnTo}${join}via=${provider}`,
  });
}

/** A provider's sign-in came back with ?error=: what to tell the person. */
export function providerError(code: string | null, via: string | null): string | null {
  if (!code) return null;
  const name = PROVIDER_NAMES[via as SignInProvider] ?? 'That';
  if (code === 'account_not_linked') {
    return 'That email already has a CarInfo account. Sign in to it below with its password or a code by email.';
  }
  return `${name} sign-in did not finish. Try again, or use your email.`;
}
