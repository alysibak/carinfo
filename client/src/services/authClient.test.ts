import { describe, expect, it } from 'vitest';
import { authErrorMessage, safeNext } from './authClient';

describe('safeNext', () => {
  it('keeps paths on this site', () => {
    expect(safeNext('/compare?ids=a,b')).toBe('/compare?ids=a,b');
  });

  it('refuses anything that leaves the site', () => {
    for (const raw of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      'javascript:alert(1)',
    ]) {
      expect(safeNext(raw, '/home')).toBe('/home');
    }
    expect(safeNext(null)).toBe('/account');
  });
});

describe('authErrorMessage', () => {
  it('says what went wrong in plain words', () => {
    expect(authErrorMessage({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(
      'Wrong email or password.',
    );
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many tries/);
    expect(authErrorMessage({ status: 0 })).toMatch(/Could not reach CarInfo/);
  });

  it("passes on the server's own sentence for a refused request", () => {
    expect(
      authErrorMessage({ status: 400, message: 'Cancel Pro under Manage billing first.' }),
    ).toBe('Cancel Pro under Manage billing first.');
  });
});
