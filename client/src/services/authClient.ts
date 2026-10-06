import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth's browser client. The session is an httpOnly cookie on the
 * site's own origin; this client only calls /api/auth (the server's basePath)
 * and keeps the session in a shared store, so every useSession() sees one
 * request's answer.
 */
export const authClient = createAuthClient({ basePath: '/api/auth' });

export type AuthSession = typeof authClient.$Infer.Session;

interface AuthError {
  status?: number;
  code?: string;
  message?: string;
}

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
  INVALID_PASSWORD: 'That password is not right.',
  INVALID_EMAIL: 'Enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Use at least 8 characters for the password.',
  PASSWORD_TOO_LONG: 'Use at most 128 characters for the password.',
  USER_ALREADY_EXISTS: 'An account with that email already exists. Sign in instead.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'An account with that email already exists. Sign in instead.',
  INVALID_TOKEN: 'This link has expired or was already used. Ask for a new one.',
  TOKEN_EXPIRED: 'This link has expired. Ask for a new one.',
  SESSION_EXPIRED: 'For your security, sign in again first.',
  SESSION_NOT_FRESH: 'For your security, sign in again first.',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'This account signs in with Google and has no password.',
};

/** Better Auth's error, as a sentence for the person at the form. */
export function authErrorMessage(
  error: AuthError | null | undefined,
  fallback = 'Something went wrong. Try again.',
): string {
  if (!error) return fallback;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return 'Too many tries. Wait a minute, then try again.';
  if (!error.status) return 'Could not reach CarInfo. Check your connection and try again.';
  // Errors the server writes for people, such as the Pro check on delete.
  if (error.status === 400 && error.message) return error.message;
  return fallback;
}

/**
 * Where to go after signing in: a path on this site, never another site
 * (`//evil.example` and `/\evil.example` are other sites to a browser).
 */
export function safeNext(raw: string | null | undefined, fallback = '/account'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }
  return raw;
}
