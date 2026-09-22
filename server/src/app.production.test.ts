import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';

/**
 * Behaviour that only exists in a production build. Routes are registered at
 * module load, so these load a fresh copy of the app with NODE_ENV set.
 */
let app: Express;
const previousEnv = process.env.NODE_ENV;
const previousLimit = process.env.DISABLE_RATE_LIMIT;

beforeAll(async () => {
  process.env.NODE_ENV = 'production';
  process.env.DISABLE_RATE_LIMIT = 'false';
  vi.resetModules();
  app = (await import('./app.js')).default;
});

afterAll(() => {
  process.env.NODE_ENV = previousEnv;
  process.env.DISABLE_RATE_LIMIT = previousLimit;
  vi.resetModules();
});

describe('production app', () => {
  it('does not register the raw pipeline dump', async () => {
    const { getAllCars } = await import('./services/car.service.js');
    const id = getAllCars()[0].id;
    const res = await request(app).get(`/api/cars/${id}/raw`);
    // Falls through to /:id with id "…/raw" unmatched → JSON 404, never the dump.
    expect(res.body?.data?.raw).toBeUndefined();
  });

  it('rate-limits VIN lookups before they reach NHTSA', async () => {
    const statuses: number[] = [];
    // Malformed VINs are rejected with 400 after the limiter, so no network.
    for (let i = 0; i < 25; i += 1) {
      statuses.push((await request(app).get('/api/vin/bad')).status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    expect(statuses.slice(20).every((s) => s === 429)).toBe(true);
  });

  it('returns a JSON body and standard headers when limiting', async () => {
    const res = await request(app).get('/api/vin/bad');
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, error: expect.stringMatching(/too many/i) });
    expect(res.headers['ratelimit-policy']).toBeDefined();
  });
});
