import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import app from './app.js';
import { getAllCars } from './services/car.service.js';

let sampleId: string;

beforeAll(() => {
  sampleId = getAllCars().find((c) => c.make === 'Toyota' && c.year >= 2020)!.id;
});

describe('health', () => {
  it('reports the loaded corpus and is never cached', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.carsTotal).toBeGreaterThan(20_000);
    expect(res.body.dataVersion).toEqual(expect.any(String));
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('cross-cutting behavior', () => {
  it('sets security headers and drops the Express fingerprint', async () => {
    const res = await request(app).get('/api/cars/makes');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('tags every response with a request id, honouring a sane inbound one', async () => {
    const generated = await request(app).get('/api/cars/makes');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await request(app).get('/api/cars/makes').set('x-request-id', 'trace-123');
    expect(echoed.headers['x-request-id']).toBe('trace-123');
  });

  it('allows the configured origin and refuses others', async () => {
    const ok = await request(app).get('/api/cars/makes').set('origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const evil = await request(app).get('/api/cars/makes').set('origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers unknown API paths with JSON, not the SPA', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, requestId: expect.any(String) });
  });

  it('treats a malformed percent-escape in a path as a 400, not a crash', async () => {
    for (const path of [
      '/api/cars/%ZZ',
      '/api/cars/%ZZ/dashboard',
      '/api/cars/makes/%E0%A4%A/models',
    ]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(400);
      expect(res.body.error).toMatch(/malformed percent-encoding/);
    }
  });

  it('does not echo an enormous unknown path back whole', async () => {
    const res = await request(app).get(`/api/${'a'.repeat(5000)}`);
    expect(res.status).toBe(404);
    expect(res.body.error.length).toBeLessThan(260);
  });

  it('rejects malformed JSON with a 400 and a readable message', async () => {
    const res = await request(app)
      .post('/api/cars/search')
      .set('content-type', 'application/json')
      .send('{"query": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/could not be parsed/i);
  });

  it('rejects an oversized body with 413', async () => {
    const res = await request(app)
      .post('/api/cars/search')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ query: 'x'.repeat(300 * 1024) }));
    expect(res.status).toBe(413);
  });
});

describe('caching', () => {
  it('serves read endpoints with a long CDN TTL and an ETag', async () => {
    const res = await request(app).get('/api/cars/makes');
    expect(res.headers['cache-control']).toMatch(/s-maxage=\d+/);
    expect(res.headers['cache-control']).toMatch(/stale-while-revalidate/);
    expect(res.headers.etag).toMatch(/^W\/"/);
  });

  it('revalidates to 304 with no body', async () => {
    const first = await request(app).get('/api/cars/makes');
    const second = await request(app)
      .get('/api/cars/makes')
      .set('if-none-match', first.headers.etag);
    expect(second.status).toBe(304);
    expect(second.text).toBeFalsy();
  });

  it('gives different queries different ETags', async () => {
    const a = await request(app).get('/api/cars/search?q=camry');
    const b = await request(app).get('/api/cars/search?q=civic');
    expect(a.headers.etag).not.toBe(b.headers.etag);
  });

  it('never lets a shared cache store account responses', async () => {
    const res = await request(app).get('/api/me/status');
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });
});

describe('cars API', () => {
  it('lists makes', async () => {
    const res = await request(app).get('/api/cars/makes');
    expect(res.body.data).toContain('Toyota');
  });

  it('returns a car by id, and a JSON 404 for an unknown one', async () => {
    const hit = await request(app).get(`/api/cars/${sampleId}`);
    expect(hit.status).toBe(200);
    expect(hit.body.data.id).toBe(sampleId);

    const miss = await request(app).get('/api/cars/no-such-car');
    expect(miss.status).toBe(404);
    expect(miss.body).toMatchObject({ success: false, error: 'Car not found' });
  });

  it('searches over POST and over the cacheable GET mirror identically', async () => {
    const viaPost = await request(app)
      .post('/api/cars/search')
      .send({ query: 'camry', limit: 5, sort: { field: 'year', order: 'desc' } });
    const viaGet = await request(app).get('/api/cars/search?q=camry&limit=5&sort=year:desc');
    expect(viaGet.status).toBe(200);
    expect(viaGet.body.data.total).toBe(viaPost.body.data.total);
    expect(viaGet.body.data.results.map((c: { id: string }) => c.id)).toEqual(
      viaPost.body.data.results.map((c: { id: string }) => c.id),
    );
  });

  it('applies GET filters', async () => {
    const res = await request(app).get('/api/cars/search?make=Tesla&fuelType=electric&limit=50');
    expect(res.body.data.results.length).toBeGreaterThan(0);
    for (const car of res.body.data.results) {
      expect(car.make).toBe('Tesla');
      expect(car.engine.fuelType).toBe('electric');
    }
  });

  it('clamps the page size', async () => {
    const res = await request(app).get('/api/cars/search?limit=100000');
    expect(res.body.data.results.length).toBeLessThanOrEqual(500);
  });

  it('validates compare requests', async () => {
    expect((await request(app).post('/api/cars/compare').send({})).status).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/cars/compare')
          .send({ ids: ['a', 'b', 'c', 'd', 'e', 'f'] })
      ).status,
    ).toBe(400);

    const ok = await request(app)
      .post('/api/cars/compare')
      .send({ ids: [sampleId, 'missing-id'] });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toHaveLength(1);
    expect(ok.body.notFound).toEqual(['missing-id']);
  });

  it('builds a dossier whose numbers reconcile', async () => {
    const res = await request(app).get(`/api/cars/${sampleId}/dashboard`);
    expect(res.status).toBe(200);
    const { resaleImpact: r } = res.body.data.ownership;
    expect(r.currentValue.mid - r.projectedResale5Year.mid).toBeCloseTo(
      r.estimatedLoss5Year.mid,
      -1,
    );
  });

  it('serves similar vehicles and sibling configurations', async () => {
    const similar = await request(app).get(`/api/cars/${sampleId}/similar?limit=4`);
    expect(similar.body.data.length).toBeLessThanOrEqual(4);
    expect(similar.body.data.every((c: { id: string }) => c.id !== sampleId)).toBe(true);

    const siblings = await request(app).get(`/api/cars/${sampleId}/siblings`);
    expect(siblings.status).toBe(200);
  });

  it('exposes the raw pipeline dump in development', async () => {
    const res = await request(app).get(`/api/cars/${sampleId}/raw`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data)).toEqual(['raw', 'enriched', 'normalized']);
  });

  it('computes chart density and points', async () => {
    const density = await request(app).get('/api/cars/stats/chart-density?metric=mpg');
    expect(density.body.data.cells.length).toBeGreaterThan(0);
    const points = await request(app).get('/api/cars/stats/chart-points?limit=50');
    expect(points.body.data.points.length).toBeLessThanOrEqual(50);
  });
});

describe('VIN API', () => {
  it('rejects malformed VINs before calling NHTSA', async () => {
    for (const bad of ['short', 'IOQIOQIOQIOQIOQIO', '1HGCM82633A00435!']) {
      const res = await request(app).get(`/api/vin/${encodeURIComponent(bad)}`);
      expect(res.status, bad).toBe(400);
    }
  });
});

describe('account API without configuration', () => {
  it('reports capabilities publicly', async () => {
    const res = await request(app).get('/api/me/status');
    expect(res.body.data).toMatchObject({
      authConfigured: expect.any(Boolean),
      freeGarageLimit: 10,
    });
  });

  it('refuses account calls when auth is not configured', async () => {
    const previous = process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_SECRET_KEY;
    try {
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(503);
    } finally {
      if (previous) process.env.CLERK_SECRET_KEY = previous;
    }
  });

  it('demands a bearer token when auth is configured', async () => {
    const previous = process.env.CLERK_SECRET_KEY;
    process.env.CLERK_SECRET_KEY = 'sk_test_placeholder';
    try {
      const missing = await request(app).get('/api/me');
      expect(missing.status).toBe(401);

      const garbage = await request(app).get('/api/me').set('authorization', 'Bearer not-a-jwt');
      expect(garbage.status).toBe(401);
    } finally {
      if (previous) process.env.CLERK_SECRET_KEY = previous;
      else delete process.env.CLERK_SECRET_KEY;
    }
  });
});

describe('security headers', () => {
  it('sends the baseline Content-Security-Policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBe(
      "base-uri 'self';object-src 'none';frame-ancestors 'none'",
    );
  });
});
