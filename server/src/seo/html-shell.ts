import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { escapeHtml, serializeJsonLd } from './html.js';
import { absoluteUrl, siteUrl } from './site.js';
import type { PageSeo } from './vehicle-seo.js';

const SITE_NAME = 'CarInfo';

/** Where the built SPA's index.html can be, locally and inside a Vercel function. */
function templateCandidates(): string[] {
  return [
    resolve(process.cwd(), 'client', 'dist', 'index.html'),
    resolve(process.cwd(), '..', 'client', 'dist', 'index.html'),
    join(__dirname, '../../../client/dist/index.html'),
  ];
}

let cachedTemplate: string | null | undefined;

/**
 * The built SPA shell, read once. Null when the client has not been built
 * (development, where Vite serves the UI) — callers then fall through to the
 * normal SPA handling.
 */
export function loadTemplate(): string | null {
  if (cachedTemplate !== undefined) return cachedTemplate;
  const path = templateCandidates().find((p) => existsSync(p));
  cachedTemplate = path ? readFileSync(path, 'utf8') : null;
  return cachedTemplate;
}

/** Test seam. */
export function __setTemplateForTests(template: string | null | undefined): void {
  cachedTemplate = template;
}

// Tags the shell ships with that every rendered page replaces. `[^>]*` spans
// newlines, so this copes with the formatter wrapping attributes over lines.
const REPLACED_TAGS = [
  /<title>[\s\S]*?<\/title>/i,
  /<meta\b[^>]*\bname="description"[^>]*>/gi,
  /<meta\b[^>]*\bproperty="og:(?:title|description|type|url)"[^>]*>/gi,
  /<meta\b[^>]*\bname="twitter:(?:title|description)"[^>]*>/gi,
  /<link\b[^>]*\brel="canonical"[^>]*>/gi,
];

/** The site-wide link-preview image, shipped from client/public. */
export const SHARE_IMAGE_PATH = '/og-image.png';

/**
 * Link unfurlers (Facebook, LinkedIn, X) require an absolute og:image URL, but
 * the static shell can only carry a relative one. Rewrite it wherever the
 * origin is known. Without an origin the relative URL stays, which Slack and
 * iMessage still resolve.
 */
export function absolutizeShareImage(html: string, origin: string | null): string {
  if (!origin) return html;
  return html.replaceAll(`content="${SHARE_IMAGE_PATH}"`, `content="${origin}${SHARE_IMAGE_PATH}"`);
}

export function renderShell(template: string, seo: PageSeo): string {
  const fullTitle = `${seo.title} | ${SITE_NAME}`;
  const canonical = absoluteUrl(seo.canonicalPath);

  const head = [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" data-ssr />` : '',
    seo.noindex ? `<meta name="robots" content="noindex" data-ssr />` : '',
    `<meta property="og:type" content="${seo.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" data-ssr />` : '',
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    seo.jsonLd
      ? `<script type="application/ld+json" data-ssr>${serializeJsonLd(seo.jsonLd)}</script>`
      : '',
  ]
    .filter(Boolean)
    .map((tag) => `    ${tag}`)
    .join('\n');

  let html = absolutizeShareImage(template, siteUrl());
  for (const pattern of REPLACED_TAGS) html = html.replace(pattern, '');
  // Tidy the blank lines the removals leave behind.
  html = html.replace(/\n(\s*\n)+/g, '\n');
  html = html.replace(/<\/head>/i, `${head}\n  </head>`);

  if (seo.bodyHtml) {
    html = html.replace(/<div id="root"><\/div>/, `<div id="root">${seo.bodyHtml}</div>`);
  }
  return html;
}
