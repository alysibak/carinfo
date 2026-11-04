import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetErrorReportingForTests,
  buildReport,
  installErrorReporting,
  reportError,
} from './errorReporting';
import { withoutQueryUrl } from './analytics';

vi.mock('@vercel/analytics', () => ({ inject: vi.fn() }));
vi.mock('@vercel/speed-insights', () => ({ injectSpeedInsights: vi.fn() }));

describe('buildReport', () => {
  it('keeps the error, path and stack without queries', () => {
    const error = new TypeError('boom');
    error.stack = 'TypeError: boom\n    at f (https://carinfo.example/assets/a.js?t=1:1:2)';
    expect(buildReport(error, 'window', { path: '/car/x' })).toEqual({
      source: 'window',
      message: 'boom',
      path: '/car/x',
      stack: 'TypeError: boom\n    at f (https://carinfo.example/assets/a.js:1:2)',
    });
  });

  it('skips noise and failures handled elsewhere', () => {
    expect(buildReport(new Error('ResizeObserver loop limit exceeded'), 'window')).toBeNull();
    expect(buildReport('Script error.', 'window')).toBeNull();
    expect(
      buildReport(new TypeError('Failed to fetch dynamically imported module: /a.js'), 'promise'),
    ).toBeNull();
    const aborted = new DOMException('The user aborted a request.', 'AbortError');
    expect(buildReport(aborted, 'promise')).toBeNull();
    const extension = new Error('their bug');
    extension.stack = 'Error: their bug\n    at chrome-extension://abc/content.js:1:1';
    expect(buildReport(extension, 'window')).toBeNull();
  });
});

describe('reportError', () => {
  const beacon = vi.fn(() => true);

  beforeEach(() => {
    __resetErrorReportingForTests();
    beacon.mockClear();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
  });
  afterEach(() => __resetErrorReportingForTests());

  it('sends nothing until installed for production', () => {
    reportError(new Error('early'), 'boundary');
    installErrorReporting(window, false);
    reportError(new Error('dev'), 'boundary');
    expect(beacon).not.toHaveBeenCalled();
  });

  it('sends each crash once, as text/plain, and at most five a page', async () => {
    installErrorReporting({ addEventListener: () => {} }, true);
    const crash = () => new Error('same');
    reportError(crash(), 'boundary');
    reportError(crash(), 'boundary');
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe('/api/client-errors');
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(JSON.parse(await blob.text())).toMatchObject({ source: 'boundary', message: 'same' });
    for (let i = 0; i < 10; i++) reportError(new Error(`crash ${i}`), 'window');
    expect(beacon).toHaveBeenCalledTimes(5);
  });
});

describe('withoutQueryUrl', () => {
  it('drops the query and fragment from analytics addresses', () => {
    expect(withoutQueryUrl('https://carinfo.example/home?q=civic#top')).toBe(
      'https://carinfo.example/home',
    );
    expect(withoutQueryUrl('/reset-password?token=abc')).toBe('/reset-password');
  });
});
