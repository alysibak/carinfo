import express from 'express';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serveSpa } from './spa.js';

let dist: string;
const app = express();

beforeAll(() => {
  dist = mkdtempSync(path.join(tmpdir(), 'spa-'));
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(path.join(dist, 'assets', 'index-abc123.js'), 'console.log(1)');
  writeFileSync(path.join(dist, 'favicon.ico'), 'ico');
  serveSpa(app, dist);
});

afterAll(() => rmSync(dist, { recursive: true, force: true }));

describe('serveSpa', () => {
  it('answers client routes with the app shell', async () => {
    for (const route of ['/', '/garage', '/vehicles/brand/Mercedes-Benz', '/no-such-page']) {
      const res = await request(app).get(route);
      expect(res.status, route).toBe(200);
      expect(res.text, route).toContain('id="root"');
    }
  });

  it('caches hashed assets for a year and 404s a missing one', async () => {
    const hit = await request(app).get('/assets/index-abc123.js');
    expect(hit.status).toBe(200);
    expect(hit.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect((await request(app).get('/assets/index-OLDHASH.js')).status).toBe(404);
  });

  it('serves real files and 404s missing ones instead of the shell', async () => {
    expect((await request(app).get('/favicon.ico')).status).toBe(200);
    for (const file of ['/apple-touch-icon-precomposed.png', '/manifest.json', '/sitemap.xml']) {
      const res = await request(app).get(file);
      expect(res.status, file).toBe(404);
      expect(res.text, file).not.toContain('id="root"');
    }
  });
});
