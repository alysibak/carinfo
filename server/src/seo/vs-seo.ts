import type { VsPage } from '../types/car.types.js';
import { escapeHtml } from './html.js';
import { absoluteUrl } from './site.js';
import { yearFacts } from './model-seo.js';
import type { PageSeo } from './vehicle-seo.js';
import { vsTitle } from '../shared/vs-path.js';
import { vsDescription, vsDifferences } from '../shared/vs-differences.js';

/**
 * Two models side by side. Title and description mirror what the Compare
 * page sets once the app loads. Only the match-ups' pairs are indexed; any
 * other pair of models works as a page but stays out of search results.
 */
export function vsSeo(page: VsPage): PageSeo {
  const title = vsTitle(page);
  const [first, second] = page.cars.map((car) => `${car.year} ${car.label}`);
  const sides = [page.cars[0], page.cars[1]] as const;
  // As the app says it once loaded: the differences that lead, else the plain line.
  const description = vsDescription(
    [...sides],
    `${first} and ${second} side by side: fuel use, NHTSA crash ratings, recalls in Canada, owner complaints and running costs, from public records.`,
  );
  const differences = vsDifferences([...sides]);
  const url = absoluteUrl(page.path);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    ...(url ? { url } : {}),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: page.cars.length,
      itemListElement: page.cars.map((car, i) => {
        const carUrl = absoluteUrl(`/car/${encodeURIComponent(car.carId)}`);
        return {
          '@type': 'ListItem',
          position: i + 1,
          name: `${car.year} ${car.label}`,
          ...(carUrl ? { url: carUrl } : {}),
        };
      }),
    },
  };

  const cars = page.cars
    .map((car) => {
      const facts = yearFacts(car.summary);
      return (
        `<h2><a href="/car/${escapeHtml(encodeURIComponent(car.carId))}">${escapeHtml(`${car.year} ${car.label}`)}</a></h2>` +
        (facts ? `<p>${escapeHtml(`Across its ${car.year} versions: ${facts}.`)}</p>` : '') +
        `<p><a href="${escapeHtml(car.modelPath)}">Every year of the ${escapeHtml(car.label)}</a></p>`
      );
    })
    .join('');
  const related = page.related.length
    ? `<h2>More match-ups</h2><ul>${page.related
        .map(
          (other) => `<li><a href="${escapeHtml(other.path)}">${escapeHtml(other.label)}</a></li>`,
        )
        .join('')}</ul>`
    : '';

  return {
    title,
    description,
    canonicalPath: page.path,
    ogType: 'website',
    jsonLd,
    noindex: !page.curated,
    bodyHtml:
      `<main class="seo-prerender">` +
      `<h1>${escapeHtml(page.label)}</h1>` +
      `<p>${escapeHtml(`${first} and ${second}, side by side.`)}</p>` +
      (differences.length
        ? `<h2>How they differ</h2><ul>${differences
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join('')}</ul>`
        : '') +
      cars +
      `<p>EPA ratings and NHTSA stars; Transport Canada's recalls and NHTSA's owner complaints for the model year, not adjusted for sales.</p>` +
      related +
      `<p><a href="/">CarInfo</a> · <a href="/compare">Compare any cars</a> · <a href="/methodology">How this data is sourced</a></p>` +
      `</main>`,
  };
}
