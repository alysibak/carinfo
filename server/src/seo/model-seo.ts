import type { ModelOverview, ModelYearSummary } from '../types/car.types.js';
import { escapeHtml } from './html.js';
import { absoluteUrl } from './site.js';
import { COMMONS_FILE } from '../utils/car-photos.js';
import type { PageSeo } from './vehicle-seo.js';

const KM_PER_MILE = 1.609344;

const span = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);
const thousands = (value: number) => `$${Math.round(value / 1000)}k`;

/** "est. value $30k–$31k, from 4.6 L/100 km, 202–301 hp, NHTSA 5/5", as the page's row reads. */
function yearFacts(row: ModelYearSummary): string {
  const { price, horsepower } = row;
  return [
    price &&
      (thousands(price.min) === thousands(price.max)
        ? `est. value ~${thousands(price.min)}`
        : `est. value ${thousands(price.min)}–${thousands(price.max)}`),
    row.combinedMpg && `from ${(235.215 / row.combinedMpg).toFixed(1)} L/100 km`,
    row.rangeMiles && `up to ${Math.round(row.rangeMiles * KM_PER_MILE)} km range`,
    horsepower &&
      (horsepower.min === horsepower.max
        ? `${horsepower.min} hp`
        : `${horsepower.min}–${horsepower.max} hp`),
    row.safetyStars && `NHTSA ${row.safetyStars}/5`,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Title and description mirror what ModelPage's usePageMeta sets once the SPA
 * loads, so a crawler and a visitor see the same page.
 */
export function modelSeo(overview: ModelOverview): PageSeo {
  const name = `${overview.make} ${overview.name}`;
  const years = span(overview.first, overview.last);
  const title = `${name}: every year, ${years}`;
  const description = `Every ${name} from ${overview.first} to ${overview.last}, year by year: estimated value, fuel use, power and NHTSA ratings, by generation.`;
  const lead = overview.lead;
  const photo =
    lead.photo && COMMONS_FILE.test(lead.photo.src)
      ? { url: lead.photo.src, alt: `Photo: ${lead.photo.caption}` }
      : undefined;
  const url = absoluteUrl(overview.path);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    about: { '@type': 'Brand', name: overview.make },
    ...(url ? { url } : {}),
    ...(photo ? { image: photo.url } : {}),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: overview.years.length,
      itemListElement: overview.years.map((row, i) => {
        const carUrl = absoluteUrl(`/car/${encodeURIComponent(row.carId)}`);
        return {
          '@type': 'ListItem',
          position: i + 1,
          name: `${row.year} ${name}`,
          ...(carUrl ? { url: carUrl } : {}),
        };
      }),
    },
  };

  return {
    title,
    description,
    canonicalPath: overview.path,
    ogType: 'website',
    jsonLd,
    ...(photo ? { image: photo } : {}),
    bodyHtml: modelSummaryHtml(overview, name, years),
  };
}

/**
 * Every year as a link to its car, by generation, and the rivals' pages:
 * what a crawler follows to reach the 37,000 car pages from a thousand.
 * React replaces it when the app mounts.
 */
function modelSummaryHtml(overview: ModelOverview, name: string, years: string): string {
  const groups: Array<{ label?: string; rows: ModelYearSummary[] }> = [];
  for (const row of overview.years) {
    const group = groups.at(-1);
    if (group && group.label === row.generation) group.rows.push(row);
    else groups.push({ label: row.generation, rows: [row] });
  }
  const sections = groups
    .map(
      (group) =>
        `<h2>${escapeHtml(group.label ?? 'Model years')}</h2><ul>` +
        group.rows
          .map(
            (row) =>
              `<li><a href="/car/${escapeHtml(encodeURIComponent(row.carId))}">${row.year} ${escapeHtml(name)}</a>` +
              `${yearFacts(row) ? `: ${escapeHtml(yearFacts(row))}` : ''}</li>`,
          )
          .join('') +
        `</ul>`,
    )
    .join('');
  const rivals = overview.rivals.length
    ? `<h2>Shopped against</h2><ul>${overview.rivals
        .map(
          (rival) =>
            `<li><a href="${escapeHtml(rival.path)}">${escapeHtml(`${rival.make} ${rival.name}`)}</a></li>`,
        )
        .join('')}</ul>`
    : '';
  return (
    `<main class="seo-prerender">` +
    `<h1>${escapeHtml(name)}</h1>` +
    `<p>${escapeHtml(`${years}, ${overview.years.length} model years on file${overview.onSale ? ', on sale' : ''}.`)} ` +
    `Each year's span or best across its configurations: EPA ratings, NHTSA stars and estimated value in CAD.</p>` +
    sections +
    rivals +
    `<p><a href="/">CarInfo</a> · <a href="/methodology">How this data is sourced</a></p>` +
    `</main>`
  );
}
