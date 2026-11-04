import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { unsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token.js';

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'unsubscribe-test-secret-0123456789abcdef';
  });
  afterEach(() => {
    delete process.env.BETTER_AUTH_SECRET;
  });

  it('names the user it was made for, and only with the same secret', () => {
    const token = unsubscribeToken('user_123')!;
    expect(verifyUnsubscribeToken(token)).toBe('user_123');
    process.env.BETTER_AUTH_SECRET = 'another-secret-entirely-0123456789abcdef';
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it('refuses a token altered to name someone else', () => {
    const [, signature] = unsubscribeToken('user_123')!.split('.');
    const forged = `${Buffer.from('user_456').toString('base64url')}.${signature}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
    expect(verifyUnsubscribeToken('garbage')).toBeNull();
    expect(verifyUnsubscribeToken('a.b.c')).toBeNull();
    expect(verifyUnsubscribeToken(undefined)).toBeNull();
  });

  it('makes none without a secret', () => {
    delete process.env.BETTER_AUTH_SECRET;
    expect(unsubscribeToken('user_123')).toBeNull();
  });
});
