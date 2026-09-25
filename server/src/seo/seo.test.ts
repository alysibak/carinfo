import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import app from '../app.js';
import { getAllCars } from '../services/car.service.js';
import { escapeHtml, serializeJsonLd } from './html.js';
import { __setTemplateForTests, absolutizeShareImage, renderShell } from './html-shell.js';
import { vehicleSeo } from './vehicle-seo.js';

const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta
      name="description"
      content="generic description"
    />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="generic" />
    <meta
      property="og:description"
      content="generic og"
    />
    <meta name="twitter:title" content="generic" />
    <title>Generic title</title>
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

function car(overrides: Partial<Car> = {}): Car {
  return {
    id: 'toyota-camry-2024',
    make: 'Toyota',
    model: 'Camry',
    year: 2024,
    provenance: {},
    engine: { fuelType: 'hybrid', displacement: 2.5, cylinders: 4 },
    fuelEconomy: { city: 51, highway: 49, combined: 50 },
    transmission: { type: 'cvt' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
    ...overrides,
  };
}

const jsonLdOf = (html: string) =>
  JSON.parse(html.match(/<script type="application\/ld\+json" data-ssr>([\s\S]*?)<\/script>/)![1]);

describe('escaping', () => {
  it('escapes markup-significant characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;',
    );
  });

  it('keeps JSON-LD from closing its script element', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});

describe('renderShell', () => {
  const original = process.env.SITE_URL;
  beforeEach(() => {
    process.env.SITE_URL = 'https://carinfo.example';
  });
  afterAll(() => {
    process.env.SITE_URL = original;
  });

  it('replaces the generic head tags instead of duplicating them', () => {
    const html = renderShell(TEMPLATE, vehicleSeo(car()));
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).toContain('<title>2024 Toyota Camry | CarInfo</title>');
    expect(html).not.toContain('generic');
    // The app bundle must survive untouched.
    expect(html).toContain('src="/assets/index-abc.js"');
  });

  it('adds an absolute canonical and og:url', () => {
    const html = renderShell(TEMPLATE, vehicleSeo(car()));
    expect(html).toContain(
      '<link rel="canonical" href="https://carinfo.example/car/toyota-camry-2024" data-ssr />',
    );
    expect(html).toContain(
      'property="og:url" content="https://carinfo.example/car/toyota-camry-2024"',
    );
  });

  it('omits absolute URLs rather than guessing when no site URL is configured', () => {
    delete process.env.SITE_URL;
    const saved = [process.env.APP_ORIGIN, process.env.VERCEL_PROJECT_PRODUCTION_URL];
    delete process.env.APP_ORIGIN;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    try {
      const html = renderShell(TEMPLATE, vehicleSeo(car()));
      expect(html).not.toContain('rel="canonical"');
      expect(html).not.toContain('og:url');
    } finally {
      if (saved[0]) process.env.APP_ORIGIN = saved[0];
      if (saved[1]) process.env.VERCEL_PROJECT_PRODUCTION_URL = saved[1];
    }
  });

  it('renders a crawlable summary inside #root for the SPA to replace', () => {
    const html = renderShell(TEMPLATE, vehicleSeo(car()));
    expect(html).toMatch(/<div id="root"><main class="seo-prerender"><h1>2024 Toyota Camry<\/h1>/);
    expect(html).toContain('<dd>50 MPG combined</dd>');
  });

  it('neutralizes hostile vehicle data everywhere it lands', () => {
    const hostile = car({
      model: `Camry"><script>alert(1)</script>`,
      trim: `</script><img src=x onerror=alert(2)>`,
    });
    const html = renderShell(TEMPLATE, vehicleSeo(hostile));
    expect(html).not.toMatch(/<script>alert/);
    expect(html).not.toMatch(/<img src=x/);
    // …while the data itself survives intact in the structured data.
    expect(jsonLdOf(html).model).toBe(hostile.model);
  });
});

describe('vehicle structured data', () => {
  it('describes the car with schema.org Car terms', () => {
    const ld = vehicleSeo(car()).jsonLd!;
    expect(ld).toMatchObject({
      '@type': 'Car',
      name: '2024 Toyota Camry',
      vehicleModelDate: '2024',
      fuelEfficiency: { value: 50, unitText: 'mpg' },
      driveWheelConfiguration: 'https://schema.org/FrontWheelDriveConfiguration',
    });
  });

  it('labels electric efficiency as MPGe', () => {
    const ld = vehicleSeo(
      car({
        engine: { fuelType: 'electric' },
        fuelEconomy: { city: 130, highway: 110, combined: 120 },
      }),
    ).jsonLd!;
    expect(ld.fuelEfficiency).toMatchObject({ value: 120, unitText: 'MPGe' });
  });

  it('never presents an estimated price as an offer', () => {
    const ld = vehicleSeo(car({ price: { msrp: 32000, isEstimated: true } })).jsonLd!;
    expect(ld).not.toHaveProperty('offers');
    expect(JSON.stringify(ld)).not.toContain('32000');
  });
});

describe('SEO routes', () => {
  let sample: Car;
  let other: Car;

  beforeAll(() => {
    __setTemplateForTests(TEMPLATE);
    [sample, other] = getAllCars().filter((c) => c.make === 'Honda' && c.year === 2022);
  });
  afterAll(() => __setTemplateForTests(undefined));

  it('serves a vehicle page with its own metadata', async () => {
    const res = await request(app).get(`/car/${sample.id}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain(
      `<title>${escapeHtml(`${sample.year} ${sample.make} ${sample.model}`)} | CarInfo</title>`,
    );
    expect(jsonLdOf(res.text)['@type']).toBe('Car');
    expect(res.headers['cache-control']).toMatch(/s-maxage/);
  });

  it('answers an unknown vehicle with a real 404, marked noindex', async () => {
    const res = await request(app).get('/car/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.text).toContain('<meta name="robots" content="noindex" data-ssr />');
  });

  it('revalidates to 304', async () => {
    const first = await request(app).get(`/car/${sample.id}`);
    const second = await request(app)
      .get(`/car/${sample.id}`)
      .set('if-none-match', first.headers.etag);
    expect(second.status).toBe(304);
  });

  it('gives shared compare links a descriptive preview and a normalized canonical', async () => {
    process.env.SITE_URL = 'https://carinfo.example';
    const res = await request(app).get(`/compare?cars=${other.id},${sample.id},${other.id}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(' vs ');
    expect(res.text).toContain(
      `/compare?cars=${encodeURIComponent(other.id)},${encodeURIComponent(sample.id)}`,
    );
    expect(res.text).toContain('content="noindex"');
  });

  it('serves the plain SPA shell for a compare with fewer than two known cars', async () => {
    // On Vercel /compare is rewritten to the function; this must not 404.
    for (const url of ['/compare', '/compare?cars=nope', `/compare?cars=${sample.id}`]) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(200);
      expect(res.text, url).toContain('<title>Generic title</title>');
    }
  });

  it('falls through entirely when the client has not been built', async () => {
    __setTemplateForTests(null);
    try {
      const res = await request(app).get(`/car/${sample.id}`);
      // Nothing of ours rendered; the request reached whatever comes next
      // (the SPA in production, Express's default 404 here).
      expect(res.text).not.toContain('application/ld+json');
      expect(res.text).not.toContain('| CarInfo</title>');
    } finally {
      __setTemplateForTests(TEMPLATE);
    }
  });
});

describe('share image', () => {
  const withImage = TEMPLATE.replace(
    '</head>',
    '<meta property="og:image" content="/og-image.png" />\n' +
      '<meta name="twitter:image" content="/og-image.png" />\n</head>',
  );

  it('is absolute on server-rendered pages when the origin is known', () => {
    const saved = process.env.SITE_URL;
    process.env.SITE_URL = 'https://carinfo.example';
    try {
      const html = renderShell(withImage, vehicleSeo(car()));
      expect(html).toContain('property="og:image" content="https://carinfo.example/og-image.png"');
      expect(html).toContain('name="twitter:image" content="https://carinfo.example/og-image.png"');
    } finally {
      process.env.SITE_URL = saved;
    }
  });

  it('stays relative without an origin, and rewriting twice changes nothing', () => {
    expect(absolutizeShareImage(withImage, null)).toBe(withImage);
    const once = absolutizeShareImage(withImage, 'https://carinfo.example');
    expect(absolutizeShareImage(once, 'https://carinfo.example')).toBe(once);
  });
});
