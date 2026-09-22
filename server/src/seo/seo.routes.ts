import { createHash } from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import * as carService from '../services/car.service.js';
import type { Car } from '../types/car.types.js';
import { loadTemplate, renderShell } from './html-shell.js';
import { vehicleName, vehicleSeo, type PageSeo } from './vehicle-seo.js';

/**
 * Server-rendered HTML shells for the pages people share and search engines
 * index. The SPA is unchanged: it still boots from the same index.html and
 * takes over the page. What changes is what exists *before* JavaScript runs —
 * which is all a link unfurler (Slack, iMessage, X, Facebook) ever sees, and
 * the first thing a crawler sees.
 *
 * Without the built client (development) every handler falls through.
 */
const router = Router();

/** Matches client/src/utils/compareIds.ts. */
const MAX_COMPARE = 5;

function send(req: Request, res: Response, seo: PageSeo, status = 200): void {
  const template = loadTemplate();
  if (!template) {
    res.status(status).end();
    return;
  }
  const html = renderShell(template, seo);
  const etag = `W/"${createHash('sha1').update(html).digest('base64url')}"`;

  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Browsers revalidate (the shell names hashed assets that change per
  // deploy); the CDN may hold it briefly and serve stale while refreshing.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('ETag', etag);
  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  res.send(html);
}

/** The built SPA shell, unmodified — for routes the function owns but cannot enrich. */
function sendPlainShell(res: Response): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.send(loadTemplate());
}

function requireTemplate(_req: Request, _res: Response, next: NextFunction): void {
  // No built client: let the normal SPA/dev handling own the route.
  if (!loadTemplate()) return next('router');
  next();
}

router.use(requireTemplate);

router.get('/car/:id', (req, res) => {
  const car = carService.getCarById(req.params.id);
  if (!car) {
    // A real 404 status: the SPA fallback used to answer every unknown URL
    // with 200, which search engines treat as a low-quality "soft 404".
    send(
      req,
      res,
      {
        title: 'Vehicle not found',
        description: 'This vehicle is not in the CarInfo database.',
        canonicalPath: req.path,
        ogType: 'website',
        noindex: true,
      },
      404,
    );
    return;
  }
  send(req, res, vehicleSeo(car));
});

router.get('/compare', (req, res) => {
  const raw = typeof req.query.cars === 'string' ? req.query.cars : '';
  const ids = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_COMPARE);
  const cars = ids.map((id) => carService.getCarById(id)).filter((c): c is Car => c != null);
  if (cars.length < 2) {
    // Nothing to describe yet — serve the untouched SPA shell. On Vercel this
    // route is rewritten to the function, so falling through would reach
    // Express's default 404 and break the page for anyone starting a compare.
    sendPlainShell(res);
    return;
  }

  const names = cars.map(vehicleName);
  const title = `Compare: ${names.join(' vs ')}`;
  send(req, res, {
    title,
    description: `Side-by-side EPA specs, fuel economy and ownership-cost estimates for ${names.join(', ')}.`,
    // The canonical is the normalized list, so reordered or duplicated links
    // consolidate rather than competing as separate pages.
    canonicalPath: `/compare?cars=${cars.map((c) => encodeURIComponent(c.id)).join(',')}`,
    ogType: 'website',
    // Compare pages are combinations of indexed vehicle pages; keep them out of
    // the index but let unfurlers use the tags above.
    noindex: true,
  });
});

export default router;
