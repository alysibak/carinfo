import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
let databaseConfigured = true;
vi.mock('../db/pool.js', () => ({
  isDatabaseConfigured: () => databaseConfigured,
  ensureSchema: async () => {},
  getPool: () => ({ query }),
}));
const sendEmail = vi.fn(async () => {});
vi.mock('../auth/email.js', () => ({
  isEmailConfigured: () => true,
  sendEmail: (...args: unknown[]) => sendEmail(...(args as [])),
}));
vi.mock('../seo/site.js', () => ({ siteUrl: () => 'https://carinfo.example' }));

const {
  browserName,
  crashFingerprint,
  recordClientError,
  renderCrashDigest,
  runCrashDigest,
  DIGEST_LIMIT,
} = await import('./client-errors.service.js');

const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';

const kind = (fields: Partial<Parameters<typeof renderCrashDigest>[0][number]> = {}) => ({
  source: 'boundary',
  message: "Cannot read properties of undefined (reading 'year')",
  path: '/car/honda-civic-2022',
  stack:
    "TypeError: Cannot read properties of undefined (reading 'year')\n    at Dossier (https://carinfo.example/assets/CarDetail-abc123.js:1:200)",
  userAgent: CHROME_ANDROID,
  fresh: 3,
  total: 10,
  firstSeen: new Date('2026-11-02T10:00:00Z'),
  lastSeen: new Date('2026-11-18T09:00:00Z'),
  ...fields,
});

describe('crashFingerprint', () => {
  it('counts the same bug once across builds, addresses and numbers', () => {
    const one = crashFingerprint({
      source: 'window',
      message: 'Failed at https://carinfo.example/assets/index-CqgTWMlL.js line 12',
    });
    const two = crashFingerprint({
      source: 'window',
      message: 'Failed at https://carinfo.example/assets/index-Ab12Cd34.js line 913',
    });
    expect(one).toBe(two);
  });

  it('tells different crashes apart', () => {
    const base = { source: 'window' as const, message: 'x is not a function' };
    expect(crashFingerprint(base)).not.toBe(crashFingerprint({ ...base, message: 'y is null' }));
    expect(crashFingerprint(base)).not.toBe(crashFingerprint({ ...base, source: 'promise' }));
  });
});

describe('browserName', () => {
  it('names the browser and system, Edge and Safari included', () => {
    expect(browserName(CHROME_ANDROID)).toBe('Chrome 131 on Android');
    expect(browserName(SAFARI_IPHONE)).toBe('Safari 18 on iOS');
    expect(browserName(EDGE_WINDOWS)).toBe('Edge 131 on Windows');
    expect(browserName(null)).toBeNull();
  });
});

describe('renderCrashDigest', () => {
  it('lists each kind with its count, page, browser and first frame', () => {
    const { subject, text, html } = renderCrashDigest([kind()], 'https://carinfo.example');
    expect(subject).toBe('CarInfo: 3 browser crash reports, 1 kind');
    expect(text).toContain("3× Cannot read properties of undefined (reading 'year')");
    expect(text).toContain('/car/honda-civic-2022 · Chrome 131 on Android');
    expect(text).toContain(
      '10 in all, the error screen showed; first seen 2026-11-02, last 2026-11-18',
    );
    expect(text).toContain('at Dossier (/assets/CarDetail-abc123.js:1:200)');
    expect(html).toContain('<a href="https://carinfo.example/car/honda-civic-2022">');
  });

  it('escapes what a browser sent', () => {
    const { html } = renderCrashDigest([kind({ message: '<img src=x onerror=alert(1)>' })], null);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('counts the kinds beyond the limit instead of listing them', () => {
    const many = Array.from({ length: DIGEST_LIMIT + 2 }, (_, i) =>
      kind({ message: `crash ${i}` }),
    );
    expect(renderCrashDigest(many, null).text).toContain('And 2 more kinds.');
  });
});

describe('recordClientError and runCrashDigest', () => {
  beforeEach(() => {
    databaseConfigured = true;
    query.mockReset();
    sendEmail.mockClear();
    process.env.CRASH_REPORTS_TO = 'owner@example.com';
  });
  afterEach(() => {
    delete process.env.CRASH_REPORTS_TO;
  });

  it('counts a report against its kind', async () => {
    query.mockResolvedValue({ rows: [] });
    await recordClientError({ source: 'window', message: 'x is not a function', path: '/home' });
    const [sql, values] = query.mock.calls[0];
    expect(sql).toMatch(
      /ON CONFLICT \(fingerprint\) DO UPDATE SET\s+count = client_errors.count \+ 1/,
    );
    expect(values.slice(1, 4)).toEqual(['window', 'x is not a function', '/home']);
  });

  it('emails what came in since the last digest, then marks it as of what it read', async () => {
    query.mockImplementation(async (sql: string) =>
      sql.startsWith('SELECT')
        ? {
            rows: [
              {
                fingerprint: 'f1',
                source: 'boundary',
                message: 'boom',
                path: '/compare',
                stack: null,
                user_agent: SAFARI_IPHONE,
                count: 7,
                reported: 2,
                first_seen: new Date('2026-11-10T00:00:00Z'),
                last_seen: new Date('2026-11-18T00:00:00Z'),
              },
            ],
          }
        : { rows: [] },
    );
    const run = await runCrashDigest();
    expect(run).toMatchObject({ kinds: 1, reports: 5, sent: true });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        subject: 'CarInfo: 5 browser crash reports, 1 kind',
      }),
    );
    expect(query.mock.calls[0][0]).toMatch(/^DELETE FROM client_errors WHERE last_seen/);
    const update = query.mock.calls.find(([sql]) => String(sql).includes('UPDATE client_errors'));
    expect(update?.[1]).toEqual([['f1'], [7]]);
  });

  it('says why when nothing can be sent, and keeps the reports for next time', async () => {
    delete process.env.CRASH_REPORTS_TO;
    query.mockImplementation(async (sql: string) =>
      sql.startsWith('SELECT')
        ? {
            rows: [
              {
                fingerprint: 'f1',
                source: 'window',
                message: 'boom',
                path: '/',
                stack: null,
                user_agent: null,
                count: 1,
                reported: 0,
                first_seen: new Date(),
                last_seen: new Date(),
              },
            ],
          }
        : { rows: [] },
    );
    const run = await runCrashDigest();
    expect(run).toMatchObject({ sent: false, reason: 'CRASH_REPORTS_TO is not set', reports: 1 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('UPDATE'))).toBe(false);
  });

  it('does nothing without a database', async () => {
    databaseConfigured = false;
    expect(await runCrashDigest()).toMatchObject({
      sent: false,
      reason: 'DATABASE_URL is not set',
    });
    await recordClientError({ source: 'window', message: 'x', path: '/' });
    expect(query).not.toHaveBeenCalled();
  });
});
