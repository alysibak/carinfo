import { createHmac, timingSafeEqual } from 'crypto';

/**
 * The token in a recall alert's unsubscribe link: the user id, signed with the
 * site's BETTER_AUTH_SECRET under its own purpose, so it turns off alerts and
 * nothing else. It does not expire: an unsubscribe link must keep working.
 */
const PURPOSE = 'carinfo:recall-alerts:unsubscribe:';

function secret(): string | null {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

function signature(key: string, userId: string): Buffer {
  return createHmac('sha256', key)
    .update(PURPOSE + userId)
    .digest();
}

/** Null when no secret is configured, so no link can be made. */
export function unsubscribeToken(userId: string): string | null {
  const key = secret();
  if (!key) return null;
  return `${Buffer.from(userId).toString('base64url')}.${signature(key, userId).toString('base64url')}`;
}

/** The user id the token was made for, or null when it is not a valid one. */
export function verifyUnsubscribeToken(token: unknown): string | null {
  const key = secret();
  if (!key || typeof token !== 'string' || token.length > 512) return null;
  const [idPart, sigPart, extra] = token.split('.');
  if (!idPart || !sigPart || extra !== undefined) return null;
  const userId = Buffer.from(idPart, 'base64url').toString('utf8');
  if (!userId) return null;
  const given = Buffer.from(sigPart, 'base64url');
  const expected = signature(key, userId);
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}
