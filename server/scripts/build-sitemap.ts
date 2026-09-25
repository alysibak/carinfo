/**
 * Write sitemap.xml (an index), its chunk files, and robots.txt into the built
 * client, so the static host serves them from the site root.
 *
 * Runs after `vite build`. Needs an absolute origin (SITE_URL, APP_ORIGIN, or
 * Vercel's production URL): the sitemap protocol requires absolute URLs, and a
 * sitemap full of localhost links would be worse than none. Without one, it
 * still writes a robots.txt that disallows the private areas, and skips the
 * sitemap with a warning.
 *
 * Usage: npm run build:sitemap
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { getAllCars, getStatistics } from '../src/services/car.service.js';
import {
  URLS_PER_SITEMAP,
  chunk,
  renderRobots,
  renderSitemapIndex,
  renderUrlset,
  type SitemapEntry,
} from '../src/seo/sitemap.js';
import { siteUrl } from '../src/seo/site.js';
import { absolutizeShareImage } from '../src/seo/html-shell.js';
import { COLLECTIONS } from '../../client/src/config/collections.js';

const here = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(here, '..', '..', 'client', 'dist');
const CHUNK_DIR = join(DIST, 'sitemaps');

const origin = siteUrl();
writeFileSync(join(DIST, 'robots.txt'), renderRobots(origin));

// The static pages (landing, search, …) are served straight from this file,
// so their share image needs its absolute URL written in at build time.
const indexPath = join(DIST, 'index.html');
writeFileSync(indexPath, absolutizeShareImage(readFileSync(indexPath, 'utf8'), origin));

if (!origin) {
  console.warn(
    '[sitemap] No SITE_URL / APP_ORIGIN / VERCEL_PROJECT_PRODUCTION_URL — wrote robots.txt only.',
  );
  process.exit(0);
}

const { lastUpdated } = getStatistics();

const pages: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/home', changefreq: 'weekly', priority: 0.9 },
  { path: '/browse', changefreq: 'weekly', priority: 0.8 },
  { path: '/value-matrix', changefreq: 'monthly', priority: 0.6 },
  { path: '/smart-search', changefreq: 'monthly', priority: 0.6 },
  { path: '/vin', changefreq: 'yearly', priority: 0.5 },
  { path: '/methodology', changefreq: 'monthly', priority: 0.5 },
  ...Object.keys(COLLECTIONS).map((id): SitemapEntry => ({
    path: `/collection/${id}`,
    changefreq: 'monthly',
    priority: 0.7,
  })),
];

// Newest model years first: when a crawler stops early, it has the pages
// shoppers most want.
const vehicles: SitemapEntry[] = [...getAllCars()]
  .sort((a, b) => b.year - a.year || a.id.localeCompare(b.id))
  .map((car) => ({
    path: `/car/${encodeURIComponent(car.id)}`,
    lastmod: lastUpdated,
    changefreq: 'monthly',
    priority: car.year >= new Date().getFullYear() - 3 ? 0.7 : 0.5,
  }));

rmSync(CHUNK_DIR, { recursive: true, force: true });
mkdirSync(CHUNK_DIR, { recursive: true });

const files: string[] = [];
writeFileSync(join(CHUNK_DIR, 'pages.xml'), renderUrlset(origin, pages));
files.push('sitemaps/pages.xml');

chunk(vehicles, URLS_PER_SITEMAP).forEach((entries, i) => {
  const name = `vehicles-${i + 1}.xml`;
  writeFileSync(join(CHUNK_DIR, name), renderUrlset(origin, entries));
  files.push(`sitemaps/${name}`);
});

writeFileSync(join(DIST, 'sitemap.xml'), renderSitemapIndex(origin, files, lastUpdated));
console.log(
  `[sitemap] ${pages.length} pages + ${vehicles.length.toLocaleString()} vehicles in ${files.length} files for ${origin}`,
);
