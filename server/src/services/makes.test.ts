import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { getMakeIndex, getMakeOverview } from './car.service.js';
import { __setTemplateForTests } from '../seo/html-shell.js';
import { makePath } from '../shared/make-path.js';

describe('make pages', () => {
  it('lists every make with model pages, A to Z, counting those on sale', () => {
    const index = getMakeIndex();
    const names = index.map((make) => make.make);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const toyota = index.find((make) => make.make === 'Toyota')!;
    expect(toyota.path).toBe('/makes/toyota');
    expect(toyota.models).toBeGreaterThan(30);
    expect(toyota.onSale).toBeGreaterThan(10);
    expect(toyota.onSale).toBeLessThan(toyota.models);
  });

  it('opens a make on its models, on sale and best known first', () => {
    const toyota = getMakeOverview('toyota')!;
    expect(toyota.make).toBe('Toyota');
    const firstPast = toyota.models.findIndex((model) => !model.onSale);
    expect(toyota.models.slice(firstPast).every((model) => !model.onSale)).toBe(true);
    expect(toyota.models.slice(0, 5).map((model) => model.name)).toContain('RAV4');
    const rav4 = toyota.models.find((model) => model.name === 'RAV4')!;
    expect(rav4.path).toBe('/models/toyota/rav4');
    expect(rav4.combinedMpg).toBeGreaterThan(30);
    expect(getMakeOverview('Mercedes-Benz')?.make).toBe('Mercedes-Benz');
    expect(getMakeOverview('flying-cars')).toBeNull();
  });

  it('spells a make’s address the way its model pages do', () => {
    expect(makePath('Mercedes-Benz')).toBe('/makes/mercedes-benz');
    expect(makePath('Land Rover')).toBe('/makes/land-rover');
  });

  describe('served', () => {
    beforeAll(() =>
      __setTemplateForTests(
        '<!doctype html><html><head><title>Generic</title></head><body><div id="root"></div></body></html>',
      ),
    );
    afterAll(() => __setTemplateForTests(undefined));

    it('as data for the app', async () => {
      const index = await request(app).get('/api/cars/make-index');
      expect(index.body.data.length).toBe(getMakeIndex().length);
      const toyota = await request(app).get('/api/cars/makes/toyota/overview');
      expect(toyota.body.data.models.length).toBeGreaterThan(30);
      expect((await request(app).get('/api/cars/makes/nope/overview')).status).toBe(404);
    });

    it('as pages search engines can follow to every model', async () => {
      const all = await request(app).get('/makes');
      expect(all.status).toBe(200);
      expect(all.text).toContain('<a href="/makes/toyota">Toyota</a>');
      const toyota = await request(app).get('/makes/toyota');
      expect(toyota.text).toContain('<title>Toyota: every model on file | CarInfo</title>');
      expect(toyota.text).toContain('<a href="/models/toyota/rav4">Toyota RAV4</a>');
      const shouted = await request(app).get('/makes/Toyota');
      expect(shouted.status).toBe(301);
      expect(shouted.headers.location).toBe('/makes/toyota');
      const missing = await request(app).get('/makes/flying-cars');
      expect(missing.status).toBe(404);
      expect(missing.text).toContain('noindex');
    });
  });
});
