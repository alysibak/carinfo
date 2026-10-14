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
import { chooseYearPhoto, makeNames, namedForYear } from './lib/year-photos.js';
import {
  COMMONS_API,
  fetchImages,
  fetchWikitext,
  generationLinks,
  infoboxes,
  infoboxGeneration,
  isSideBox,
  namesMake,
  prefixTitles,
  type Resolved,
  resolveTitles,
  searchFileNames,
  searchMatches,
  searchTitles,
  titleCandidates,
  wikiClient,
  wikiPlain,
  yearsSpanned,
} from './lib/wiki-photos.js';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const CARS_PATH = resolve(DATA_DIR, 'cars.json');
const OUT_PATH = resolve(DATA_DIR, 'car-photos.json');

/**
 * Names Wikipedia splits across articles, or files under another: the
 * Mini Cooper is the "Mini Hatch" (the "Mini" is the 1959 car), and the US
 * Ranger, Fusion, Blazer and Odyssey have articles of their own.
 */
const ALIASES: Record<string, string[]> = {
  'mini|cooper': ['Mini Hatch'],
  'mini|cooper s': ['Mini Hatch'],
  'mini|john cooper works': ['Mini Hatch'],
  'mini|hardtop': ['Mini Hatch'],
  'mini|clubman': ['Mini Clubman'],
  'mini|convertible': ['Mini Convertible'],
  'mini|paceman': ['Mini Paceman'],
  'mini|coupe': ['Mini Coupé and Roadster'],
  'mini|roadster': ['Mini Coupé and Roadster'],
  'ford|ranger': ['Ford Ranger (Americas)', 'Ford Ranger (T6)'],
  'ford|fusion': ['Ford Fusion (Americas)'],
  'chevrolet|blazer': ['Chevrolet S-10 Blazer', 'Chevrolet Blazer (crossover)'],
  'gmc|jimmy': ['Chevrolet S-10 Blazer'],
  'honda|odyssey': ['Honda Odyssey (North America)'],
};

const compactName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

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
    block('images', Object.entries(file.images)),
    block('yearPhotos', Object.entries(file.yearPhotos ?? {}), true),
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

  // 1. Titles as written, and the articles named outright where Wikipedia
  // splits a name (ALIASES).
  const candidates = new Map(
    [...asked].map(([key, { make, query }]) => [key, ALIASES[key] ?? titleCandidates(make, query)]),
  );
  const resolved = await resolveTitles(get, [...candidates.values()].flat());
  const found = new Map<string, Resolved[]>();
  for (const [key, titles] of candidates) {
    const hits = titles.map((t) => resolved.get(t)).filter((r): r is Resolved => Boolean(r));
    if (!hits.length) continue;
    // An alias names every article it wants; otherwise the first title that exists.
    const aliased = Boolean(ALIASES[key]);
    found.set(key, aliased ? hits.map((h) => ({ ...h, redirected: true })) : [hits[0]]);
  }
  log(`${found.size} names are article titles (or redirect to one).`);

  // 2. A search, for the rest, taking only a result of the same name.
  let searched = 0;
  for (const [key, { make, query }] of asked) {
    if (found.has(key)) continue;
    const results = await searchTitles(get, `${make} ${query}`);
    const hit = results.find((r) => searchMatches(r, make, query));
    if (hit) found.set(key, [{ title: hit, redirected: false }]);
    if (++searched % 200 === 0) log(`searched ${searched}...`);
  }
  log(`${found.size} names found after ${searched} searches.`);

  // 3. The articles: a car's, and of the make unless a redirect or alias led there.
  const titles = [...new Set([...found.values()].flat().map((r) => r.title))];
  const texts = await fetchWikitext(get, titles);
  log(`${texts.size} of ${titles.length} articles read.`);
  const queries: CarPhotoFile['queries'] = {};
  const models = new Map<string, { text: string; make: string }>();
  const rejected = { unread: [] as string[], notCar: [] as string[], otherMake: [] as string[] };
  for (const [key, { make }] of asked) {
    const accepted: string[] = [];
    for (const { title, redirected } of found.get(key) ?? []) {
      const text = texts.get(title);
      const boxes = text ? infoboxes(text) : [];
      if (!text) rejected.unread.push(title);
      else if (!boxes.length)
        rejected.notCar.push(`${title}: ${text.slice(0, 80).replace(/\s+/g, ' ')}`);
      else if (!redirected && !namesMake(title, boxes[0], make))
        rejected.otherMake.push(`${make}: ${title}`);
      else {
        accepted.push(title);
        models.set(title, { text, make });
      }
    }
    queries[key] = accepted.length ? accepted : null;
  }
  log(`${models.size} car articles.`);
  for (const [why, list] of Object.entries(rejected)) {
    const unique = [...new Set(list)];
    log(`  rejected, ${why}: ${unique.length}, e.g. ${unique.slice(0, 12).join(' | ')}`);
  }

  // 4. Their generations: the articles named for them ("Porsche 911 (991)",
  // "Volkswagen Golf Mk7"), linked or not, and the infoboxes in their sections.
  const makes = [...new Set(unified.map((c) => c.make))];
  const linked = new Map<string, string[]>();
  for (const [title, { text }] of models) {
    const named = new Set(generationLinks(text, title));
    for (const prefix of [`${title} (`, `${title} Mk`, `${title} Mark `]) {
      for (const t of await prefixTitles(get, prefix)) named.add(t);
    }
    linked.set(title, [...named]);
  }
  const generationTexts = await fetchWikitext(get, [...new Set([...linked.values()].flat())]);
  const articles: CarPhotoFile['articles'] = {};
  for (const [title, { text, make }] of models) {
    const generations: PhotoGeneration[] = [];
    for (const link of linked.get(title) ?? []) {
      const linkedText = generationTexts.get(link);
      const box = linkedText ? infoboxes(linkedText)[0] : undefined;
      const generation = box && infoboxGeneration(box, link);
      if (generation && !isSideBox(link.slice(title.length), make, makes)) {
        generations.push(generation);
      }
    }
    const boxes = infoboxes(text);
    for (const box of boxes.slice(1)) {
      const name = box.name ? wikiPlain(box.name) : '';
      if (isSideBox(name, make, makes)) continue;
      const generation = infoboxGeneration(box, name ? `${title}, ${name}` : title);
      if (generation) generations.push(generation);
    }
    // The article's own box, atop it, pictures one generation for all its
    // years: only when it covers about one generation's worth.
    if (!generations.length && boxes[0]) {
      const generation = infoboxGeneration(boxes[0], title);
      if (generation && yearsSpanned(generation) <= 12) generations.push(generation);
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

  // 6. A photo of each car's own model year: Commons' files named for the
  // year and make ("2021 BMW ..."), the best for each car chosen by
  // lib/year-photos.ts.
  const commons = wikiClient(undefined, undefined, COMMONS_API);
  const separateModels = new Set<string>();
  for (const [key, { make, query }] of asked) {
    const words = query.split(/\s+/);
    if (words.length !== 2) continue;
    const two = queries[key];
    const one = queries[queryKey(make, words[0])];
    if (two?.length && two[0] !== one?.[0]) separateModels.add(compactName(query));
  }
  const pairs = new Map<string, { name: string; year: number }>();
  for (const car of unified) {
    for (const name of makeNames(car.make))
      pairs.set(`${name}|${car.year}`, { name, year: car.year });
  }
  const named = new Map<string, string[]>();
  let listed = 0;
  for (const [pair, { name, year }] of pairs) {
    const found = await searchFileNames(
      commons,
      `intitle:"${year}" intitle:"${name}" filetype:bitmap`,
      (file) => namedForYear(file, year),
    );
    named.set(pair, found);
    listed += found.length;
    if (named.size % 200 === 0) log(`listed ${named.size} of ${pairs.size} makes and years...`);
  }
  log(
    `${listed} photos on Commons named for a make's model year, over ${pairs.size} makes and years.`,
  );
  const chosen = new Map<string, string>();
  for (const car of unified) {
    const candidates = makeNames(car.make).flatMap(
      (name) => named.get(`${name}|${car.year}`) ?? [],
    );
    const pick = chooseYearPhoto(candidates, car, { separateModels });
    if (pick) chosen.set(car.id, pick);
  }
  const yearImages = await fetchImages(commons, [...new Set(chosen.values())], 'local');
  const yearPhotos: Record<string, string> = {};
  for (const [id, pick] of chosen) {
    const image = yearImages.get(pick);
    if (!image) continue;
    yearPhotos[id] = pick;
    images[pick] = image;
  }
  log(`${Object.keys(yearPhotos).length} cars have a photo of their own model year.`);

  const file: CarPhotoFile = {
    source:
      'Wikipedia car articles (infobox photo and years) and Wikimedia Commons (the photos, their authors and licences)',
    fetched: new Date().toISOString().slice(0, 10),
    queries,
    articles,
    images,
    yearPhotos,
  };
  writeFileSync(OUT_PATH, serialize(file));

  // For review: a sample of the year photos chosen.
  const ids = Object.keys(yearPhotos);
  for (let i = 0; i < Math.min(60, ids.length); i++) {
    const car = unified.find((c) => c.id === ids[Math.floor((i * ids.length) / 60)]);
    if (car)
      log(`  ${car.year} ${car.make} ${car.model} [${car.bodyStyle}] -> ${yearPhotos[car.id]}`);
  }

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
