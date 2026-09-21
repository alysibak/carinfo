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
 */
const ONE_HOUR = 3600;
const ONE_DAY = 86_400;

export interface CachePolicy {
  /** Seconds a shared (CDN) cache may serve without revalidating. */
  sMaxAge?: number;
  /** Seconds a browser may serve without revalidating. */
  maxAge?: number;
  /** Seconds a stale copy may be served while revalidating behind the scenes. */
  staleWhileRevalidate?: number;
}

export const CACHE_IMMUTABLE_DATA: CachePolicy = {
  maxAge: ONE_HOUR,
  sMaxAge: ONE_DAY,
  staleWhileRevalidate: ONE_DAY * 7,
};

export const CACHE_SHORT: CachePolicy = {
  maxAge: 60,
  sMaxAge: 300,
  staleWhileRevalidate: ONE_HOUR,
};

function formatCacheControl(policy: CachePolicy): string {
  const parts = ['public'];
  if (policy.maxAge != null) parts.push(`max-age=${policy.maxAge}`);
  if (policy.sMaxAge != null) parts.push(`s-maxage=${policy.sMaxAge}`);
  if (policy.staleWhileRevalidate != null) {
    parts.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`);
  }
  return parts.join(', ');
}

/**
 * Tag responses with the dataset fingerprint plus the request's own shape, so
 * two different queries never collide on one ETag. Cheap to compute (a hash of
 * a short string) and it turns repeat traffic into 304s with no body.
 */
export function dataCache(policy: CachePolicy = CACHE_IMMUTABLE_DATA) {
  const cacheControl = formatCacheControl(policy);

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
      .update(`${version}|${req.originalUrl}`)
      .digest('base64url')}"`;

    res.setHeader('Cache-Control', cacheControl);
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
