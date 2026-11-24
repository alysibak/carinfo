import type { MakeIndexEntry, MakeOverview } from '../types/car.types.js';
import { escapeHtml } from './html.js';
import { absoluteUrl } from './site.js';
import type { PageSeo } from './vehicle-seo.js';

const span = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);

/** The A–Z list of makes; mirrors MakesIndex's title. */
export function makeIndexSeo(makes: MakeIndexEntry[]): PageSeo {
  const title = 'Every make, A to Z';
  const description = `${makes.length} makes with models on file since 1995, ${makes.filter((m) => m.onSale).length} with models on sale: open one to see its models, year by year.`;
  return {
    title,
    description,
    canonicalPath: '/makes',
    ogType: 'website',
    bodyHtml:
      `<main class="seo-prerender"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><ul>` +
      makes
        .map(
          (m) =>
            `<li><a href="${escapeHtml(m.path)}">${escapeHtml(m.make)}</a>: ${m.models} ${m.models === 1 ? 'model' : 'models'}</li>`,
        )
        .join('') +
      `</ul><p><a href="/">CarInfo</a></p></main>`,
  };
}

/** A make's page; mirrors MakePage's title and lists every model's page for crawlers. */
export function makeSeo(overview: MakeOverview): PageSeo {
  const onSale = overview.models.filter((m) => m.onSale);
  const past = overview.models.filter((m) => !m.onSale);
  const title = `${overview.make}: every model on file`;
  const description = `${overview.models.length} ${overview.make} ${overview.models.length === 1 ? 'model' : 'models'} from ${overview.first} to ${overview.last}${onSale.length ? `, ${onSale.length} on sale` : ''}: fuel use, crash ratings and recalls in Canada, year by year.`;
  const url = absoluteUrl(overview.path);
  const list = (models: MakeOverview['models']) =>
    `<ul>${models
      .map(
        (m) =>
          `<li><a href="${escapeHtml(m.path)}">${escapeHtml(`${overview.make} ${m.name}`)}</a> (${span(m.first, m.last)})</li>`,
      )
      .join('')}</ul>`;
  return {
    title,
    description,
    canonicalPath: overview.path,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      about: { '@type': 'Brand', name: overview.make },
      ...(url ? { url } : {}),
    },
    bodyHtml:
      `<main class="seo-prerender"><h1>${escapeHtml(overview.make)}</h1><p>${escapeHtml(description)}</p>` +
      (onSale.length ? `<h2>On sale</h2>${list(onSale)}` : '') +
      (past.length ? `<h2>Earlier models</h2>${list(past)}` : '') +
      `<p><a href="/makes">Every make</a> · <a href="/">CarInfo</a></p></main>`,
  };
}
