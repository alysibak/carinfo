import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { getDataVersion } from '../services/car.service.js';

/**
 * The vehicle corpus is immutable between deploys — it only changes when
 * `build-runtime-database.ts` runs and a new bundle ships. That makes every
 * read endpoint safely cacheable for a long time, which is the single cheapest
 * scaling lever available: a CDN hit costs nothing and never wakes the function.
 *
 * `stale-while-revalidate` lets the edge keep serving the old copy while it
 * refreshes in the background, so a deploy never produces a latency spike.
 *
 * Only the CDN keeps a copy, though (Vercel's starts afresh with each deploy):
 * browsers revalidate every time, a 304 when nothing changed. A browser that
 * kept data an hour and could then serve it stale for a week went on showing
 * cars without the photos a deploy had added, long after it.
 */
const ONE_HOUR = 3600;
const ONE_DAY = 86_400;

export interface CachePolicy {
  /** Seconds the CDN may serve without revalidating. */
  sMaxAge: number;
  /** Seconds the CDN may serve a stale copy while it revalidates behind the scenes. */
  staleWhileRevalidate: number;
}

export const CACHE_IMMUTABLE_DATA: CachePolicy = {
  sMaxAge: ONE_DAY,
  staleWhileRevalidate: ONE_DAY * 7,
};

export const CACHE_SHORT: CachePolicy = {
  sMaxAge: 300,
  staleWhileRevalidate: ONE_HOUR,
};

/** Browsers revalidate every time: the ETag makes that a 304 while the data is the same. */
const BROWSER_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/** Stands in for a deployment name where the host gives none: a restart is a deploy there. */
const PROCESS_STARTED = `started-${Date.now()}`;

/**
 * The deployment serving the response. An ETag has to change with the code
 * that shapes a response, not only with the data: a deploy that added the
 * model count to /stats/overview kept the dataset's ETag, so browsers holding
 * the old body revalidated, got 304 and kept a body without the field, and
 * the new home page crashed reading it. Vercel names every deployment.
 */
export function deploymentId(): string {
  return process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || PROCESS_STARTED;
}

/** For Vercel's CDN alone (it reads this over Cache-Control and passes it on to no one). */
function formatCdnCacheControl(policy: CachePolicy): string {
  return `public, max-age=${policy.sMaxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`;
}

/**
 * Tag responses with the dataset fingerprint, the deployment and the request's
 * own shape, so two different queries never collide on one ETag and a deploy
 * never 304s a body the new code no longer sends. Cheap to compute (a hash of
 * a short string) and it turns repeat traffic into 304s with no body.
 */
export function dataCache(policy: CachePolicy = CACHE_IMMUTABLE_DATA) {
  const cdnCacheControl = formatCdnCacheControl(policy);

  return function dataCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
    let version: string;
    try {
      version = getDataVersion();
    } catch {
      // Database not loadable — do not advertise cacheability for an error page.
      next();
      return;
    }

    const etag = `W/"${createHash('sha1')
      .update(`${version}|${deploymentId()}|${req.originalUrl}`)
      .digest('base64url')}"`;

    res.setHeader('Cache-Control', BROWSER_CACHE_CONTROL);
    res.setHeader('Vercel-CDN-Cache-Control', cdnCacheControl);
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding');

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch.split(',').some((tag) => tag.trim() === etag)) {
      res.status(304).end();
      return;
    }

    next();
  };
}

/** Explicitly mark a response as private and uncacheable (account, billing). */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store, private');
  next();
}
