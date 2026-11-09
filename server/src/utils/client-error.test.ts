import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import { parseClientError } from './client-error.js';

const report = {
  source: 'boundary',
  message: 'Cannot read properties of undefined (reading "car")',
  path: '/car/honda-civic-2022',
  stack:
    'TypeError: Cannot read properties of undefined\n    at Dossier (https://carinfo.example/assets/CarDetail-abc123.js?v=2:1:200)',
};

describe('parseClientError', () => {
  it('keeps a report, trimmed, and drops queries that could carry tokens', () => {
    const parsed = parseClientError(
      JSON.stringify({ ...report, path: '/reset-password?token=secret', message: 'x'.repeat(900) }),
      'Mozilla/5.0',
    );
    expect(parsed).toMatchObject({ source: 'boundary', path: '/reset-password' });
    expect(parsed!.message).toHaveLength(500);
    expect(parsed!.userAgent).toBe('Mozilla/5.0');
    expect(parseClientError(report)!.stack).toContain('CarDetail-abc123.js:1:200');
    expect(parseClientError(report)!.stack).not.toContain('?v=2');
  });

  it('refuses what is not a report', () => {
    expect(parseClientError('not json')).toBeNull();
    expect(parseClientError({ ...report, source: 'server' })).toBeNull();
    expect(parseClientError({ ...report, message: '  ' })).toBeNull();
    expect(parseClientError({ ...report, path: 'https://elsewhere.example/' })).toBeNull();
    expect(parseClientError(null)).toBeNull();
  });
});

describe('POST /api/client-errors', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs a text/plain report without an IP address and answers 204', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app)
      .post('/api/client-errors')
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .set('X-Forwarded-For', '203.0.113.9')
      .send(JSON.stringify(report));
    expect(res.status).toBe(204);
    const line = log.mock.calls
      .map((call) => String(call[0]))
      .find((l) => l.includes('client error'));
    expect(line).toBeDefined();
    expect(JSON.parse(line!)).toMatchObject({ level: 'error', path: report.path });
    expect(line).not.toContain('203.0.113.9');
  });

  it('rejects a malformed report', async () => {
    const res = await request(app)
      .post('/api/client-errors')
      .set('Content-Type', 'text/plain')
      .send('{"source":"nope"}');
    expect(res.status).toBe(400);
  });
});
