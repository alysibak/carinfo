/**
 * Download the public government data the site's safety, recall, complaint,
 * size and fuel-price facts come from, into server/data/public/, for review
 * before any of it reaches a car. Each part also saves samples of what it
 * read (server/data/public/probe/), so a change in a source's format shows.
 *
 * Runs on GitHub's runners (.github/workflows/public-data.yml), which reach
 * the sources; the sandboxes this site is built in do not.
 *
 * Usage: tsx scripts/fetch-public-data.ts <part> [files]
 *   nhtsa-ratings                       every vehicle NHTSA has rated since 2011: stars, safety features
 *   canadian-specs                      Transport Canada's dimensions and weights, through NHTSA's vPIC
 *   recalls <FLAT_RCL.txt> <RCL.txt>    NHTSA recall campaigns, by make, model and year
 *   complaints <FLAT_CMPL.txt> <CMPL.txt>  NHTSA owner complaints, counted by make, model, year and part
 *   canada-recalls                      Transport Canada's recall database, from open.canada.ca
 *   fuel-prices                         Statistics Canada's monthly pump prices, by city
 *   nrcan                               NRCan's fuel consumption ratings files: the cars sold in Canada
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { gzipSync } from 'zlib';
import { basename, dirname, join, resolve } from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { fetchBuffer, fetchJson, fetchText, HttpError } from './lib/fetch.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(scriptDir, '..', 'data', 'public');
const PROBE = join(OUT, 'probe');
const CARS_PATH = resolve(scriptDir, '..', 'data', 'cars.json');
const NHTSA = 'https://api.nhtsa.gov/SafetyRatings';
const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const NRCAN_DATASET = '98f1a129-f628-4ce4-b24d-6f16bf24dd64';
const CKAN = 'https://open.canada.ca/data/api/action';
const STATCAN_PRICES = 'https://www150.statcan.gc.ca/n1/tbl/csv/18100001-eng.zip';
/** NHTSA's current star ratings began with the 2011 models; earlier stars measured differently. */
const FIRST_RATED_YEAR = 2011;
const FIRST_YEAR = 1995;

mkdirSync(PROBE, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function write(name: string, data: unknown): void {
  writeFileSync(join(OUT, name), JSON.stringify(data));
  console.log(`Wrote ${name}`);
}

function probe(name: string, data: unknown): void {
  writeFileSync(join(PROBE, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

/**
 * A GET, one at a time with a pause between, that tries again on a dropped
 * connection, a refusal (403, 429) or a 5xx: thousands run per part, and
 * NHTSA's hosts refused a burst of four at once outright.
 */
const PAUSE_MS = 250;
let failures = 0;
async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    await sleep(PAUSE_MS);
    try {
      return await fetchJson<T>(url, 60_000);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 0;
      const retry = status === 0 || status === 403 || status === 429 || status >= 500;
      if (!retry || attempt === 4) {
        // Said, not swallowed: an empty answer and a refused one are not the same.
        if (++failures <= 10) console.log(`  Failed: ${String(err)}`);
        throw err;
      }
      await sleep(2000 * 3 ** attempt);
    }
  }
}

/** Run fn over items, a few at a time: the hosts are government services, not CDNs. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
        done++;
        if (done % 500 === 0) console.log(`  ${done} of ${items.length}`);
      }
    }),
  );
  return out;
}

interface Results<T> {
  Results?: T[];
}

/** Every vehicle NHTSA has star-rated since 2011, with its ratings and safety features. */
async function nhtsaRatings(): Promise<void> {
  const years = ((await getJson<Results<{ ModelYear: number }>>(NHTSA)).Results ?? [])
    .map((r) => Number(r.ModelYear))
    .filter((y) => y >= FIRST_RATED_YEAR)
    .sort();
  console.log(`NHTSA rates model years ${years[0]}–${years.at(-1)}`);

  const pairs: Array<{ year: number; make: string }> = [];
  for (const year of years) {
    const makes = (await getJson<Results<{ Make: string }>>(`${NHTSA}/modelyear/${year}`)).Results;
    for (const { Make } of makes ?? []) pairs.push({ year, make: Make });
  }
  const models = (
    await mapLimit(pairs, 1, async ({ year, make }) => {
      const url = `${NHTSA}/modelyear/${year}/make/${encodeURIComponent(make)}`;
      const list = (await getJson<Results<{ Model: string }>>(url).catch(() => null))?.Results;
      return (list ?? []).map(({ Model }) => ({ year, make, model: Model }));
    })
  ).flat();
  console.log(`${models.length} rated models`);

  const vehicles = (
    await mapLimit(models, 1, async ({ year, make, model }) => {
      const url = `${NHTSA}/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`;
      const list = (await getJson<Results<{ VehicleId: number }>>(url).catch(() => null))?.Results;
      return (list ?? []).map(({ VehicleId }) => VehicleId);
    })
  ).flat();
  console.log(`${vehicles.length} rated vehicles`);

  let sampled = false;
  const details = await mapLimit(vehicles, 1, async (id) => {
    const res = await getJson<Results<Record<string, unknown>>>(`${NHTSA}/VehicleId/${id}`).catch(
      () => null,
    );
    const detail = res?.Results?.[0];
    if (!detail) return null;
    if (!sampled) {
      sampled = true;
      probe('nhtsa-vehicle.json', res);
    }
    // The crash-test pictures and videos are links per test; the vehicle's own picture stays.
    return Object.fromEntries(
      Object.entries(detail).filter(
        ([key]) => key === 'VehiclePicture' || !/Picture|Video/.test(key),
      ),
    );
  });
  const rated = details.filter(Boolean);
  write('nhtsa-ratings.json', {
    source: 'https://api.nhtsa.gov/SafetyRatings',
    fetchedAt: new Date().toISOString(),
    vehicles: rated,
  });
  console.log(
    `Done: ${rated.length} NHTSA-rated vehicles, ${years[0]}–${years.at(-1)} (${failures} requests failed)`,
  );
}

/** Transport Canada's dimensions and weights for each make and year, as vPIC serves them. */
async function canadianSpecs(): Promise<void> {
  const { cars } = JSON.parse(readFileSync(CARS_PATH, 'utf8')) as {
    cars: Array<{ make: string; year: number }>;
  };
  const makes = [...new Set(cars.map((car) => car.make))].sort();
  const last = Math.max(...cars.map((car) => car.year));
  const pairs = makes.flatMap((make) =>
    Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => ({ make, year: FIRST_YEAR + i })),
  );
  let sampled = false;
  const rows = (
    await mapLimit(pairs, 1, async ({ make, year }) => {
      const url = `${VPIC}/GetCanadianVehicleSpecifications/?year=${year}&make=${encodeURIComponent(make)}&units=Metric&format=json`;
      const res = await getJson<Results<{ Specs?: Array<{ Name: string; Value: string }> }>>(
        url,
      ).catch(() => null);
      const results = res?.Results ?? [];
      if (!sampled && results.length) {
        sampled = true;
        probe('canadian-specs.json', { url, ...res, Results: results.slice(0, 5) });
      }
      // Each result is a list of name and value pairs: one object per vehicle.
      return results.map((result) =>
        Object.fromEntries((result.Specs ?? []).map((spec) => [spec.Name, spec.Value])),
      );
    })
  ).flat();
  write('canadian-specs.json', {
    source: `${VPIC}/GetCanadianVehicleSpecifications`,
    fetchedAt: new Date().toISOString(),
    rows,
  });
  console.log(
    `Done: ${rows.length} Canadian vehicle specifications for ${makes.length} makes (${failures} requests failed)`,
  );
}

/** Field names in order from one of NHTSA's flat-file layout notes ("1  CMPLID  CHAR(9) ..."). */
function layoutFields(layoutPath: string): string[] {
  const text = readFileSync(layoutPath, 'latin1');
  const fields: string[] = [];
  for (const match of text.matchAll(/^\s*(\d{1,2})\s+([A-Z][A-Z0-9_]+)\s/gm)) {
    const n = Number(match[1]);
    if (n === fields.length + 1) fields.push(match[2]);
  }
  if (fields.length < 10) throw new Error(`Read only ${fields.length} fields from ${layoutPath}`);
  return fields;
}

async function* tabRows(
  path: string,
  fields: string[],
  sample: string,
): AsyncGenerator<Record<string, string>> {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'latin1' }) });
  const head: string[] = [];
  for await (const line of lines) {
    if (head.length < 8) {
      head.push(line);
      if (head.length === 8) probe(sample, { fields, lines: head });
    }
    const values = line.split('\t');
    yield Object.fromEntries(fields.map((field, i) => [field, (values[i] ?? '').trim()]));
  }
  if (head.length < 8) probe(sample, { fields, lines: head });
}

const year = (text: string) => {
  const n = Number(text);
  return Number.isInteger(n) && n >= FIRST_YEAR && n <= 2035 ? n : null;
};

/** NHTSA recall campaigns for vehicles since 1995, and the makes, models and years each covers. */
async function recalls(flatPath: string, layoutPath: string): Promise<void> {
  const fields = layoutFields(layoutPath);
  probe('recalls-layout.json', fields);
  const campaigns: Record<string, Record<string, string>> = {};
  const vehicles: Record<string, string[]> = {};
  const keep = [
    'COMPNAME',
    'MFGNAME',
    'RCLTYPECD',
    'POTAFF',
    'ODATE',
    'RCDATE',
    'DATEA',
    'DESC_DEFECT',
    'CONEQUENCE_DEFECT',
    'CORRECTIVE_ACTION',
    'NOTES',
    'FMVSS',
    'DO_NOT_DRIVE',
    'PARK_OUTSIDE',
  ];
  for await (const row of tabRows(flatPath, fields, 'recalls-head.json')) {
    const y = year(row.YEARTXT);
    if (!row.CAMPNO || !y || (row.RCLTYPECD && row.RCLTYPECD !== 'V')) continue;
    campaigns[row.CAMPNO] ??= Object.fromEntries(
      keep.filter((k) => row[k]).map((k) => [k, row[k]]),
    );
    const key = `${row.MAKETXT}|${row.MODELTXT}|${y}`;
    const list = (vehicles[key] ??= []);
    if (!list.includes(row.CAMPNO)) list.push(row.CAMPNO);
  }
  write('nhtsa-recalls.json', {
    source: 'https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL.zip',
    fetchedAt: new Date().toISOString(),
    fields,
    campaigns,
    vehicles,
  });
  console.log(
    `Done: ${Object.keys(campaigns).length} recall campaigns over ${Object.keys(vehicles).length} make, model and year listings`,
  );
}

interface ComplaintCount {
  complaints: number;
  crashes: number;
  fires: number;
  injuries: number;
  deaths: number;
  /** Complaints naming each part, by NHTSA's component name ("ENGINE", "ELECTRICAL SYSTEM"). */
  parts: Record<string, number>;
}

/** NHTSA owner complaints since 1995, counted by make, model, year and the part complained of. */
async function complaints(flatPath: string, layoutPath: string): Promise<void> {
  const fields = layoutFields(layoutPath);
  probe('complaints-layout.json', fields);
  const counts: Record<string, ComplaintCount> = {};
  // One complaint is a row per part it names: count it once, its parts each.
  const seen = new Set<string>();
  for await (const row of tabRows(flatPath, fields, 'complaints-head.json')) {
    const y = year(row.YEARTXT);
    if (!y || !row.ODINO) continue;
    const key = `${row.MAKETXT}|${row.MODELTXT}|${y}`;
    const count = (counts[key] ??= {
      complaints: 0,
      crashes: 0,
      fires: 0,
      injuries: 0,
      deaths: 0,
      parts: {},
    });
    const id = `${key}|${row.ODINO}`;
    if (!seen.has(id)) {
      seen.add(id);
      count.complaints++;
      if (row.CRASH === 'Y') count.crashes++;
      if (row.FIRE === 'Y') count.fires++;
      count.injuries += Number(row.INJURED) || 0;
      count.deaths += Number(row.DEATHS) || 0;
    }
    // "ENGINE AND ENGINE COOLING:ENGINE" counts under its system, "ENGINE AND
    // ENGINE COOLING", once a complaint however many of its parts it names.
    for (const part of (row.COMPDESC || 'UNKNOWN').split('|')) {
      const system = part.split(':')[0].trim() || 'UNKNOWN';
      if (seen.has(`${id}|${system}`)) continue;
      seen.add(`${id}|${system}`);
      count.parts[system] = (count.parts[system] ?? 0) + 1;
    }
  }
  write('nhtsa-complaints.json', {
    source: 'https://static.nhtsa.gov/odi/ffdd/cmpl/FLAT_CMPL.zip',
    fetchedAt: new Date().toISOString(),
    fields,
    counts,
  });
  console.log(`Done: complaints for ${Object.keys(counts).length} make, model and year listings`);
}

interface CkanResource {
  name?: string;
  url: string;
  format?: string;
  language?: string[];
  size?: number;
}

interface CkanPackage {
  id: string;
  title: string;
  organization?: { title?: string };
  resources: CkanResource[];
}

/** Transport Canada's Motor Vehicle Safety Recalls Database, as open.canada.ca lists it. */
async function canadaRecalls(): Promise<void> {
  const search = await getJson<{ result: { results: CkanPackage[] } }>(
    `${CKAN}/package_search?q=${encodeURIComponent('motor vehicle safety recalls')}&rows=10`,
  );
  probe(
    'canada-recalls-search.json',
    search.result.results.map((p) => ({
      id: p.id,
      title: p.title,
      organization: p.organization?.title,
      resources: p.resources.map((r) => ({
        name: r.name,
        format: r.format,
        url: r.url,
        size: r.size,
      })),
    })),
  );
  const dataset = search.result.results.find(
    (p) => /recall/i.test(p.title) && /transport/i.test(p.organization?.title ?? ''),
  );
  if (!dataset) throw new Error('No Transport Canada recall dataset found on open.canada.ca');
  console.log(`Transport Canada recalls: ${dataset.title} (${dataset.id})`);
  const dir = join(OUT, 'canada-recalls');
  mkdirSync(dir, { recursive: true });
  for (const resource of dataset.resources) {
    if (
      !/csv/i.test(resource.format ?? '') ||
      (resource.language && !resource.language.includes('en'))
    )
      continue;
    const name = decodeURIComponent(basename(new URL(resource.url).pathname)) || 'recalls.csv';
    const body = await fetchBuffer(resource.url, 300_000);
    writeFileSync(join(dir, `${name}.gz`), gzipSync(body, { level: 9 }));
    probe(
      `canada-recalls-${name}.txt`,
      body.toString('latin1').split(/\r?\n/).slice(0, 12).join('\n'),
    );
    console.log(`  ${name}: ${(body.length / 1e6).toFixed(1)} MB`);
  }
  console.log('Done: Transport Canada recall files');
}

/** Statistics Canada table 18-10-0001-01: monthly pump prices by city, cents a litre. */
async function fuelPrices(): Promise<void> {
  const zipPath = join(OUT, 'statcan-18100001.zip');
  writeFileSync(zipPath, await fetchBuffer(STATCAN_PRICES, 300_000));
  const csv = execFileSync('unzip', ['-p', zipPath, '18100001.csv'], {
    maxBuffer: 1024 * 1024 * 1024,
  }).toString('utf8');
  const rows = parse(csv, { columns: true, bom: true, skip_empty_lines: true }) as Array<
    Record<string, string>
  >;
  probe('fuel-prices-head.json', rows.slice(0, 5));
  const productKey = Object.keys(rows[0]).find((k) => /product/i.test(k)) ?? 'Type of product';
  probe('fuel-prices-products.json', [...new Set(rows.map((r) => r[productKey]))]);
  const months = [...new Set(rows.map((r) => r.REF_DATE))].sort().slice(-25);
  const recent = rows.filter((r) => months.includes(r.REF_DATE) && r.VALUE !== '');
  write('fuel-prices.json', {
    source: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
    fetchedAt: new Date().toISOString(),
    rows: recent.map((r) => ({
      month: r.REF_DATE,
      place: r.GEO,
      product: r[productKey],
      unit: r.UOM,
      value: Number(r.VALUE),
    })),
  });
  execFileSync('rm', ['-f', zipPath]);
  console.log(`Done: ${recent.length} prices, ${months[0]}–${months.at(-1)}`);
}

/** NRCan's fuel consumption ratings files, every year: the cars certified for sale in Canada. */
async function nrcan(): Promise<void> {
  const { result } = await getJson<{ result: { resources: CkanResource[] } }>(
    `${CKAN}/package_show?id=${NRCAN_DATASET}`,
  );
  const dir = join(OUT, 'nrcan');
  mkdirSync(dir, { recursive: true });
  let files = 0;
  for (const resource of result.resources) {
    if (!/csv/i.test(resource.format ?? '') || !resource.language?.includes('en')) continue;
    const name = decodeURIComponent(basename(new URL(resource.url).pathname));
    writeFileSync(join(dir, name), await fetchText(resource.url, 300_000));
    files++;
  }
  console.log(`Done: ${files} NRCan files`);
}

const [part, ...files] = process.argv.slice(2);
const parts: Record<string, () => Promise<void>> = {
  'nhtsa-ratings': nhtsaRatings,
  'canadian-specs': canadianSpecs,
  recalls: () => recalls(files[0], files[1]),
  complaints: () => complaints(files[0], files[1]),
  'canada-recalls': canadaRecalls,
  'fuel-prices': fuelPrices,
  nrcan,
};
if (!parts[part]) {
  console.error(`Usage: fetch-public-data.ts <${Object.keys(parts).join('|')}> [files]`);
  process.exit(2);
}
parts[part]().catch((err) => {
  console.error(err);
  process.exit(1);
});
