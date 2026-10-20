/**
 * Pre-build enriched+normalized cars for fast serverless cold starts.
 * Runtime loads cars-ready.json and skips per-request enrichCar/normalize.
 *
 * Usage: npm run build-runtime-db --workspace=server
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { enrichCar } from '../src/services/content-enrichment.js';
import {
  normalizeCarRecord,
  unifyMakeSpelling,
  unifyModelSpelling,
} from '../src/utils/car-normalize.js';
import { cleanCorpusHorsepower } from '../src/utils/horsepower-plausibility.js';
import { resolveDataFile } from '../src/utils/data-paths.js';
import { ensureUniqueIds } from '../src/utils/unique-ids.js';
import { withRunningCosts } from '../src/utils/running-cost.js';
import { loadCarPhotos, withCarPhotos } from '../src/utils/car-photos.js';
import { packRuntimeDatabase } from '../src/services/runtime-db.js';
import { withNhtsaRatingsFor, withSizesFor } from '../src/services/car.service.js';
import type { Car } from '../src/types/car.types.js';

interface CarDatabase {
  cars: Car[];
  lastUpdated: string;
  sources?: string[];
}

const started = Date.now();
const dbPath = resolveDataFile('cars.json');
if (!dbPath) {
  console.error('[build-runtime-db] cars.json not found');
  process.exit(1);
}

console.log(`[build-runtime-db] Reading ${dbPath}...`);
const db = JSON.parse(readFileSync(dbPath, 'utf-8')) as CarDatabase;
console.log(
  `[build-runtime-db] Enriching + normalizing ${db.cars.length.toLocaleString()} cars...`,
);

const { cars: normalized, report: hp } = cleanCorpusHorsepower(
  // Photos by EPA's own model names, before the display names replace them.
  withCarPhotos(unifyModelSpelling(unifyMakeSpelling(db.cars)), loadCarPhotos()).map((car) =>
    normalizeCarRecord(enrichCar(car)),
  ),
);
for (const [count, what] of [
  [hp.induction, 'borrowed from a non-turbo sibling'],
  [hp.shared, 'shared by two engines of one model'],
  [hp.yearOverYear, "out of line with the same engine's other years"],
  [hp.implausible, 'no engine of that size and induction makes'],
] as const) {
  if (count) console.log(`[build-runtime-db] Dropped ${count} horsepower rating(s) ${what}.`);
}
if (hp.corrected) {
  console.log(
    `[build-runtime-db] Set ${hp.corrected} horsepower rating(s) to the manufacturer's figure.`,
  );
}
if (hp.filled) {
  console.log(
    `[build-runtime-db] Filled ${hp.filled} horsepower rating(s) from the same engine in the same model (estimated).`,
  );
}

// NHTSA's ratings by model line, body and drivetrain, from data/nhtsa-ratings.json.
const nhtsa = withNhtsaRatingsFor(normalized);
console.log(
  `[build-runtime-db] NHTSA: ${nhtsa.described.toLocaleString()} cars described by a test, ${nhtsa.rated.toLocaleString()} with an overall rating.`,
);
// Transport Canada's measurements, from data/canadian-specs.json.
const sizes = withSizesFor(nhtsa.cars);
console.log(`[build-runtime-db] Transport Canada: ${sizes.sized.toLocaleString()} cars sized.`);
// Slug collisions made some vehicles unreachable by ID — see utils/unique-ids.ts.
const { cars: unique, report } = ensureUniqueIds(sizes.cars);
// Yearly running costs, for "cheapest to own" searches (see utils/running-cost.ts).
const cars = withRunningCosts(unique);
const photographed = cars.filter((car) => car.photo).length;
console.log(
  `[build-runtime-db] Photos (Wikimedia Commons) for ${photographed.toLocaleString()} of ${cars.length.toLocaleString()} cars.`,
);
if (report.mergedDuplicates.length || report.renamed.length) {
  console.log(
    `[build-runtime-db] ID collisions: merged ${report.mergedDuplicates.length} duplicate listing(s), ` +
      `disambiguated ${report.renamed.length} distinct vehicle(s).`,
  );
  for (const { from, to } of report.renamed) console.log(`  ${from} -> ${to}`);
}
const out = packRuntimeDatabase(cars, {
  lastUpdated: db.lastUpdated,
  sources: db.sources?.length ? db.sources : ['epa'],
  builtAt: new Date().toISOString(),
});
console.log(
  `[build-runtime-db] Interned provenance: ${out.provenance.length} distinct maps across ${cars.length.toLocaleString()} cars.`,
);

const outPath = resolve(dbPath, '..', 'cars-ready.json');
const payload = JSON.stringify(out);
writeFileSync(outPath, payload);
const mb = (Buffer.byteLength(payload) / (1024 * 1024)).toFixed(1);
console.log(
  `[build-runtime-db] Wrote ${outPath} (${cars.length.toLocaleString()} cars, ${mb} MB) in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
