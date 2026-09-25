import { escapeHtml } from './html.js';

/**
 * Sitemap protocol limits are 50,000 URLs and 50 MB per file. The corpus is
 * ~36k vehicles today, which would fit in one file, but chunking keeps a data
 * rebuild that grows the corpus from silently producing an invalid sitemap.
 */
export const URLS_PER_SITEMAP = 10_000;

export interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

function isoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
}

export function renderUrlset(origin: string, entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const lastmod = isoDate(e.lastmod);
      return [
        '  <url>',
        `    <loc>${escapeHtml(`${origin}${e.path}`)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : '',
        e.priority != null ? `    <priority>${e.priority.toFixed(1)}</priority>` : '',
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n</urlset>\n`
  );
}

export function renderSitemapIndex(origin: string, files: string[], lastmod?: string): string {
  const date = isoDate(lastmod);
  const items = files
    .map(
      (f) =>
        `  <sitemap>\n    <loc>${escapeHtml(`${origin}/${f}`)}</loc>` +
        `${date ? `\n    <lastmod>${date}</lastmod>` : ''}\n  </sitemap>`,
    )
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${items}\n</sitemapindex>\n`
  );
}

export function renderRobots(origin: string | null): string {
  return [
    'User-agent: *',
    // Personal and API surfaces have nothing to index.
    'Disallow: /api/',
    'Disallow: /account',
    'Disallow: /garage',
    'Disallow: /shared-garage',
    'Allow: /',
    ...(origin ? ['', `Sitemap: ${origin}/sitemap.xml`] : []),
    '',
  ].join('\n');
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
