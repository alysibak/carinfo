import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

/** A page address with nothing after "?" or "#": search words and email tokens stay out. */
export function withoutQueryUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url.split(/[?#]/)[0];
  }
}

/**
 * Vercel Web Analytics and Speed Insights: cookieless, served from the site's
 * own /_vercel/ paths, so the CSP's script-src 'self' covers them. Loaded
 * after the page, off the critical path the bundle budget guards.
 */
export function installAnalytics(): void {
  inject({
    mode: 'production',
    beforeSend: (event) => ({ ...event, url: withoutQueryUrl(event.url) }),
  });
  injectSpeedInsights({
    beforeSend: (event) => ({ ...event, url: withoutQueryUrl(event.url) }),
  });
}
