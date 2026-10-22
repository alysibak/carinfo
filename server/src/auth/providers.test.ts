import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appleClientSecret, configuredProviders, socialProviderOptions } from './providers';

const KEYS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'APPLE_CLIENT_ID',
  'APPLE_CLIENT_SECRET',
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_PRIVATE_KEY',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
];

afterEach(() => {
  for (const key of KEYS) vi.stubEnv(key, '');
  vi.unstubAllEnvs();
});

function appleKey() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
}

describe('sign-in providers', () => {
  it('offers each only once its keys are set', () => {
    for (const key of KEYS) vi.stubEnv(key, '');
    expect(configuredProviders()).toEqual([]);
    expect(socialProviderOptions()).toEqual({});
    vi.stubEnv('GOOGLE_CLIENT_ID', 'g');
    expect(configuredProviders()).toEqual([]);
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'gs');
    vi.stubEnv('MICROSOFT_CLIENT_ID', 'm');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', 'ms');
    expect(configuredProviders()).toEqual(['google', 'microsoft']);
    expect(socialProviderOptions()).toMatchObject({
      google: { clientId: 'g', clientSecret: 'gs' },
      microsoft: { clientId: 'm', clientSecret: 'ms', tenantId: 'common' },
    });
  });

  it('signs Apple’s client secret with the key, for six months at most', () => {
    const pem = appleKey();
    vi.stubEnv('APPLE_CLIENT_ID', 'ca.carinfo.web');
    vi.stubEnv('APPLE_TEAM_ID', 'TEAM123456');
    vi.stubEnv('APPLE_KEY_ID', 'KEY1234567');
    // As a host that keeps one line per variable stores it.
    vi.stubEnv('APPLE_PRIVATE_KEY', pem.replace(/\n/g, '\\n'));
    const now = Date.UTC(2026, 9, 22);
    const token = appleClientSecret(now)!;
    const [header, payload, signature] = token.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({
      alg: 'ES256',
      kid: 'KEY1234567',
    });
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    expect(claims).toMatchObject({
      iss: 'TEAM123456',
      sub: 'ca.carinfo.web',
      aud: 'https://appleid.apple.com',
      iat: now / 1000,
    });
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(15_777_000);
    const valid = verify(
      'sha256',
      Buffer.from(`${header}.${payload}`),
      { key: createPublicKey(pem), dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature, 'base64url'),
    );
    expect(valid).toBe(true);
    expect(configuredProviders()).toEqual(['apple']);
  });

  it('turns Apple off, not sign-in, when its key will not load', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('APPLE_CLIENT_ID', 'ca.carinfo.web');
    vi.stubEnv('APPLE_TEAM_ID', 'TEAM123456');
    vi.stubEnv('APPLE_KEY_ID', 'KEY1234567');
    vi.stubEnv('APPLE_PRIVATE_KEY', 'not a key');
    expect(configuredProviders()).toEqual([]);
    expect(socialProviderOptions()).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
