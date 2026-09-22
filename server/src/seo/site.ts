/**
 * The public origin of the site, used for canonical URLs, Open Graph URLs,
 * the sitemap and robots.txt — all of which must be absolute.
 *
 * Resolution order: SITE_URL, then APP_ORIGIN (already required for Stripe
 * redirects), then the production domain Vercel injects at build and run time.
 * Returns null when none is known, and callers omit absolute URLs rather than
 * emit a wrong one (a canonical pointing at localhost would de-index the site).
 */
export function siteUrl(): string | null {
  const candidates = [
    process.env.SITE_URL,
    process.env.APP_ORIGIN,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
      if (process.env.NODE_ENV === 'production' && /^(localhost|127\.)/.test(url.hostname))
        continue;
      return url.origin;
    } catch {
      continue;
    }
  }
  return null;
}

export function absoluteUrl(path: string): string | null {
  const origin = siteUrl();
  return origin ? `${origin}${path.startsWith('/') ? path : `/${path}`}` : null;
}
