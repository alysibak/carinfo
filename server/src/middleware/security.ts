import type { CorsOptions } from 'cors';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Origins allowed to call the API from a browser.
 *
 * Account endpoints authenticate with a Bearer token rather than a cookie, so a
 * permissive CORS policy was never a session-riding risk — but there is also no
 * reason for arbitrary sites to drive this API, and an allowlist keeps a future
 * cookie-based feature from silently inheriting `*`.
 *
 * Non-browser clients (curl, server-to-server, health checks) send no Origin
 * header at all and are unaffected.
 */
function allowedOrigins(): string[] {
  const configured = [process.env.APP_ORIGIN, process.env.ADDITIONAL_ORIGINS]
    .filter((v): v is string => Boolean(v?.trim()))
    .flatMap((v) => v.split(','))
    .map((v) => v.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Vercel injects the deployment URL; allow preview deployments to call themselves.
  if (process.env.VERCEL_URL) configured.push(`https://${process.env.VERCEL_URL}`);

  if (configured.length === 0) {
    // Nothing configured (local dev, tests) — fall back to the dev servers.
    return ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'];
  }
  return Array.from(new Set(configured));
}

export function corsOptions(): CorsOptions {
  const allowed = new Set(allowedOrigins());
  return {
    origin(origin, callback) {
      // No Origin => not a browser request (curl, SSR, health probe). Allow.
      if (!origin) return callback(null, true);
      if (allowed.has(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(null, false);
    },
    credentials: false,
    maxAge: 86_400,
  };
}

/**
 * Rate limits.
 *
 * Every limiter is keyed by IP and skips successful preflight. The tiers differ
 * by how expensive the endpoint is to serve and how much damage abuse does:
 *
 *  - `publicRead`   cached reads; generous, mostly a runaway-client guard.
 *  - `search`       full-corpus sort per call; real CPU.
 *  - `vinDecode`    proxies an upstream public API we do not want to get
 *                   blocked from, so this is the tightest tier.
 *  - `write`        mutates account state or hits Stripe.
 */
function limiter(windowMs: number, max: number, message: string): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Trust the platform's forwarded-for chain; Vercel and most PaaS set it.
    handler(_req: Request, res: Response) {
      res.status(429).json({ success: false, error: message });
    },
    skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
  });
}

export const publicReadLimiter = () =>
  limiter(60_000, 300, 'Too many requests. Please slow down and try again shortly.');

export const searchLimiter = () =>
  limiter(60_000, 90, 'Too many searches. Please wait a moment and try again.');

export const vinDecodeLimiter = () =>
  limiter(60_000, 20, 'Too many VIN lookups. Please wait a minute and try again.');

export const writeLimiter = () =>
  limiter(60_000, 40, 'Too many requests. Please wait a moment and try again.');

export const statsWriteLimiter = () =>
  limiter(60_000, 5, 'Too many requests.');
