/**
 * Collect a photo of each car's generation from Wikipedia and Wikimedia
 * Commons, in data/car-photos.json. build-runtime-db then gives each car the
 * photo of its own generation (src/utils/car-photos.ts).
 *
 * For each model name the cars carry (see photoQueries), the article it
 * names: its title as written, else a search result of the same name, and
 * only if its infobox is a car's and names the make. From that article, the
 * generations: the articles it links that are named for it ("Honda Civic
 * (tenth generation)") and the infoboxes in its own sections, each with the
 * model years it covers and its photo. Only photos on Commons are kept, with
 * their author and licence; Wikipedia's own files are non-free.
 *
 * Usage: tsx scripts/build-car-photos.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Car } from '../src/types/car.types.js';
import {
  type CarPhotoFile,
  photoFor,
  type PhotoGeneration,
  photoQueries,
  queryKey,
} from '../src/utils/car-photos.js';
import { unifyMakeSpelling, unifyModelSpelling } from '../src/utils/car-normalize.js';
import {
  fetchImages,
  fetchWikitext,
  generationLinks,
  infoboxes,
  infoboxGeneration,
  namesMake,
  resolveTitles,
  searchMatches,
  searchTitles,
  titleCandidates,
  wikiClient,
  wikiPlain,
} from './lib/wiki-photos.js';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const CARS_PATH = resolve(DATA_DIR, 'cars.json');
const OUT_PATH = resolve(DATA_DIR, 'car-photos.json');

function log(message: string): void {
  console.log(`[car-photos] ${message}`);
}

/** The file, a query, article or image to a line, so a refresh's diff reads by entry. */
function serialize(file: CarPhotoFile): string {
  const block = (name: string, entries: [string, unknown][], last = false) =>
    [
      `  ${JSON.stringify(name)}: {`,
      entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(',\n'),
      `  }${last ? '' : ','}`,
    ].join('\n');
  return [
    '{',
    `  "source": ${JSON.stringify(file.source)},`,
    `  "fetched": ${JSON.stringify(file.fetched)},`,
    block('queries', Object.entries(file.queries)),
    block('articles', Object.entries(file.articles)),
    block('images', Object.entries(file.images), true),
    '}',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const { cars } = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as { cars: Car[] };
  // As build-runtime-db sees them, which is where the photos are matched.
  const unified = unifyModelSpelling(unifyMakeSpelling(cars));
  const get = wikiClient();

  // Every model name, by make.
  const asked = new Map<string, { make: string; query: string }>();
  for (const car of unified) {
    for (const query of photoQueries(car)) {
      asked.set(queryKey(car.make, query), { make: car.make, query });
    }
  }
  log(`${asked.size} model names to look up, from ${unified.length} cars.`);

  // 1. Titles as written.
  const candidates = new Map(
    [...asked].map(([key, { make, query }]) => [key, titleCandidates(make, query)]),
  );
  const resolved = await resolveTitles(get, [...candidates.values()].flat());
  const found = new Map<string, string>();
  for (const [key, titles] of candidates) {
    const hit = titles.map((t) => resolved.get(t)).find(Boolean);
    if (hit) found.set(key, hit);
  }
  log(`${found.size} names are article titles (or redirect to one).`);

  // 2. A search, for the rest, taking only a result of the same name.
  let searched = 0;
  for (const [key, { make, query }] of asked) {
    if (found.has(key)) continue;
    const results = await searchTitles(get, `${make} ${query}`);
    const hit = results.find((r) => searchMatches(r, make, query));
    if (hit) found.set(key, hit);
    if (++searched % 200 === 0) log(`searched ${searched}...`);
  }
  log(`${found.size} names found after ${searched} searches.`);

  // 3. The articles: a car's, of the make.
  const texts = await fetchWikitext(get, [...new Set(found.values())]);
  const queries: CarPhotoFile['queries'] = {};
  const models = new Map<string, string>();
  for (const [key, { make }] of asked) {
    const title = found.get(key);
    const text = title ? texts.get(title) : undefined;
    const boxes = text ? infoboxes(text) : [];
    const ok = title && boxes.length > 0 && namesMake(title, boxes[0], make);
    queries[key] = ok ? title : null;
    if (ok) models.set(title, text!);
  }
  log(`${models.size} car articles.`);

  // 4. Their generations.
  const linked = new Map<string, string[]>();
  for (const [title, text] of models) linked.set(title, generationLinks(text, title));
  const generationTexts = await fetchWikitext(get, [...new Set([...linked.values()].flat())]);
  const articles: CarPhotoFile['articles'] = {};
  for (const [title, text] of models) {
    const generations: PhotoGeneration[] = [];
    for (const link of linked.get(title) ?? []) {
      const linkedText = generationTexts.get(link);
      const box = linkedText ? infoboxes(linkedText)[0] : undefined;
      const generation = box && infoboxGeneration(box, link);
      if (generation) generations.push(generation);
    }
    const boxes = infoboxes(text);
    // The infoboxes in its sections; the article's own, atop it, covers
    // every generation, so it counts only when it is the only one.
    for (const box of boxes.slice(1)) {
      const name = box.name ? wikiPlain(box.name) : '';
      const generation = infoboxGeneration(box, name ? `${title}, ${name}` : title);
      if (generation) generations.push(generation);
    }
    if (!generations.length && boxes[0]) {
      const generation = infoboxGeneration(boxes[0], title);
      if (generation) generations.push(generation);
    }
    const seen = new Set<string>();
    articles[title] = generations.filter((g) => {
      const key = `${g.image}|${g.years.join('-')}`;
      return !seen.has(key) && seen.add(key);
    });
  }
  const generationCount = Object.values(articles).flat().length;
  log(`${generationCount} generations with a photo and years.`);

  // 5. The photos: on Commons, with author and licence.
  const files = [...new Set(Object.values(articles).flatMap((gs) => gs.map((g) => g.image)))];
  const images = Object.fromEntries(await fetchImages(get, files));
  log(`${Object.keys(images).length} of ${files.length} photos are on Commons.`);

  const file: CarPhotoFile = {
    source:
      'Wikipedia car articles (infobox photo and years) and Wikimedia Commons (the photo, its author and licence)',
    fetched: new Date().toISOString().slice(0, 10),
    queries,
    articles,
    images,
  };
  writeFileSync(OUT_PATH, serialize(file));

  // What the site gets from it.
  const byDecade = new Map<number, [number, number]>();
  let photographed = 0;
  const missing = new Map<string, number>();
  for (const car of unified) {
    const photo = photoFor(car, file);
    const decade = Math.floor(car.year / 5) * 5;
    const counts = byDecade.get(decade) ?? [0, 0];
    counts[1]++;
    if (photo) {
      photographed++;
      counts[0]++;
    } else {
      const name = `${car.make} ${photoQueries(car)[0] ?? car.model}`;
      missing.set(name, (missing.get(name) ?? 0) + 1);
    }
    byDecade.set(decade, counts);
  }
  log(
    `Done: a photo for ${photographed} of ${unified.length} cars (${((100 * photographed) / unified.length).toFixed(1)}%).`,
  );
  for (const [start, [have, all]] of [...byDecade].sort(([a], [b]) => a - b)) {
    log(`  ${start}-${start + 4}: ${have} of ${all}`);
  }
  const top = [...missing].sort((a, b) => b[1] - a[1]).slice(0, 40);
  log(`Most listings without one: ${top.map(([n, c]) => `${n} (${c})`).join('; ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
