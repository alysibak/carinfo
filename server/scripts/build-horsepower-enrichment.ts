/**
 * Build a reliable horsepower enrichment file from the EPA Test Car List Data.
 *
 * Source: https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy
 *
 * Why this source (instead of scraping Edmunds / Car and Driver):
 *   - Free, public, official U.S. EPA data — the same provenance family ('epa') the
 *     rest of this database is already built on (see build-verified-database.ts).
 *   - Contains a real, measured "Rated Horsepower" (RHP) column per tested engine
 *     configuration. This is verified data, NOT the random estimate the legacy
 *     fetch-nhtsa-real-data.ts produced (engineCylinders * 50 + Math.random()*100).
 *   - No Terms-of-Service violation, no anti-bot/Cloudflare fragility, fully
 *     reproducible offline once the per-year files are cached.
 *
 * Pipeline:
 *   1. Auto-discover the per-model-year file URLs from the EPA index page
 *      (filenames encode the model year, e.g. 26-testcar-*.xlsx, 16tstcar.csv).
 *   2. Download + cache them under data/raw/test-car-data/ (xlsx and csv supported).
 *   3. Parse RHP from both EPA schemas (modern verbose + legacy coded 2000–2009).
 *   4. Match every vehicle in cars.json by engine (displacement + cylinders) and
 *      carline name, then write data/horsepower-enrichment.json keyed by epaId.
 *
 * The result is merged into records at load time by services/content-enrichment.ts
 * (provenance: 'epa'), consistent with the static-JSON architecture.
 *
 * Usage:
 *   npm run build-horsepower                       # MY2000..current year
 *   tsx scripts/build-horsepower-enrichment.ts --from=2010 --to=2026
 *   tsx scripts/build-horsepower-enrichment.ts --offline   # use cached files only
 *   tsx scripts/build-horsepower-enrichment.ts --refresh   # ignore cached downloads
 */

import axios from 'axios';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import type { Car } from '../src/types/car.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const RAW_DIR = join(DATA_DIR, 'raw');
const TESTCAR_DIR = join(RAW_DIR, 'test-car-data');
const CARS_PATH = join(DATA_DIR, 'cars.json');
const HP_OUT = join(DATA_DIR, 'horsepower-enrichment.json');

const INDEX_URL =
  'https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy';

const CURRENT_YEAR = new Date().getFullYear();
const CID_TO_LITRES = 0.0163871; // legacy displacement is in cubic inches

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const fromYear = parseInt(getArg('from') ?? '2000', 10);
const toYear = parseInt(getArg('to') ?? String(CURRENT_YEAR), 10);
const offline = args.includes('--offline');
const refresh = args.includes('--refresh');

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Normalize a make/model token for matching: lowercase, strip non-alphanumerics. */
function norm(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * A set of horsepower readings is "tight" enough to trust without an exact carline
 * match when its spread is small (engines that only ever made one power figure).
 * Guards against averaging, e.g., a base 2.0T and a hot 2.0T of the same make/year.
 */
function isTight(values: number[]): boolean {
  if (values.length === 0) return false;
  const spread = Math.max(...values) - Math.min(...values);
  return spread <= Math.max(15, 0.08 * median(values));
}

function twoDigitYearToFull(yy: number): number {
  return yy < 50 ? 2000 + yy : 1900 + yy;
}

function extractYear(value: unknown): number {
  const m = String(value ?? '').match(/(?:19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : NaN;
}

// ---------------------------------------------------------------------------
// 1. Discover + download the EPA per-year files
// ---------------------------------------------------------------------------

/** Map model year → list of downloadable file URLs parsed from the EPA index page. */
async function discoverFileUrls(): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  try {
    const res = await axios.get<string>(INDEX_URL, { responseType: 'text', timeout: 30000 });
    const html = res.data;
    // Filenames start with the 2-digit model year, then "tstcar"/"testcar", e.g.
    //   .../2026-01/26-testcar-2026-01-21.xlsx   .../2016-07/16tstcar.csv
    const re = /href="(https:\/\/www\.epa\.gov\/[^"]+\/(\d{2})-?t(?:e)?stcar[^"/]*\.(?:xlsx|csv))"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const url = m[1];
      const year = twoDigitYearToFull(parseInt(m[2], 10));
      const list = map.get(year) ?? [];
      list.push(url);
      map.set(year, list);
    }
    console.log(`Discovered EPA test-car files for ${map.size} model years.`);
  } catch (err) {
    console.warn(`Could not fetch EPA index page (${(err as Error).message}). Falling back to cached files.`);
  }
  return map;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  writeFileSync(dest, Buffer.from(res.data));
}

/** Ensure files for [fromYear, toYear] are present locally; return their paths. */
async function ensureTestCarFiles(): Promise<string[]> {
  mkdirSync(TESTCAR_DIR, { recursive: true });

  if (!offline) {
    const urlMap = await discoverFileUrls();
    for (let year = fromYear; year <= toYear; year++) {
      for (const url of urlMap.get(year) ?? []) {
        const base = url.split('/').pop()!;
        const dest = join(TESTCAR_DIR, base);
        if (existsSync(dest) && !refresh) continue;
        try {
          console.log(`  Downloading ${year}: ${base}`);
          await downloadFile(url, dest);
        } catch (err) {
          console.warn(`  Failed to download ${url}: ${(err as Error).message}`);
        }
      }
    }
  }

  // Use every cached file whose filename-encoded year falls in range (also lets a
  // user drop manually downloaded files into the folder for offline runs).
  const paths: string[] = [];
  for (const file of readdirSync(TESTCAR_DIR)) {
    const match = /^(\d{2})-?t(?:e)?stcar.*\.(xlsx|csv)$/i.exec(file);
    if (!match) continue;
    const year = twoDigitYearToFull(parseInt(match[1], 10));
    if (year < fromYear || year > toYear) continue;
    paths.push(join(TESTCAR_DIR, file));
  }
  return paths.sort();
}

// ---------------------------------------------------------------------------
// 2. Parse the EPA files into per-make/year and per-engine/year variant indexes
// ---------------------------------------------------------------------------

interface Variant {
  model: string; // normalized carline
  displ: string; // litres, 1 decimal ('' if unknown)
  cyl: string; // cylinder count ('' if unknown)
  hp: number;
}

interface Indexes {
  byMakeYear: Map<string, Variant[]>; // `${make}|${year}`
  byEngineYear: Map<string, Variant[]>; // `${displ}|${cyl}|${year}` (cross-make)
}

interface Extractor {
  year: string;
  make: string;
  model: string;
  displ?: string;
  cyl?: string;
  hp: string;
  displIsCid: boolean;
}

/**
 * The EPA shipped two schemas:
 *   - modern verbose (2009 late-release onward): "Rated Horsepower",
 *     "Represented Test Veh Make/Model", displacement already in litres.
 *   - legacy coded (2000–2009): VC_RTD_HP_MSR, VI_MFR_NM, CL_NM, and
 *     GBE_CID_MSR displacement in CUBIC INCHES.
 */
function buildExtractor(keys: string[]): Extractor | null {
  const find = (re: RegExp) => keys.find((k) => re.test(k));

  const modernHp = find(/rated\s*horsepower/i);
  if (modernHp) {
    const make = find(/represented test veh make/i) ?? find(/\bmake\b/i);
    const model = find(/represented test veh model/i) ?? find(/\bcarline\b/i) ?? find(/\bmodel\b/i);
    const year = find(/model\s*year/i);
    if (make && model && year) {
      return { year, make, model, displ: find(/displacement/i), cyl: find(/cylinders/i), hp: modernHp, displIsCid: false };
    }
  }

  const legacyHp = keys.find((k) => k === 'VC_RTD_HP_MSR') ?? find(/rtd_hp/i);
  if (legacyHp) {
    const make = keys.find((k) => k === 'VI_MFR_NM') ?? find(/mfr_nm/i);
    const model = keys.find((k) => k === 'CL_NM') ?? find(/cl_nm/i);
    const year = keys.find((k) => k === 'MDLYR_DT') ?? find(/mdlyr/i);
    if (make && model && year) {
      return {
        year,
        make,
        model,
        displ: keys.find((k) => k === 'GBE_CID_MSR') ?? find(/cid_msr/i),
        cyl: keys.find((k) => k === 'VC_CYL_CNT') ?? find(/cyl_cnt/i),
        hp: legacyHp,
        displIsCid: true,
      };
    }
  }

  return null;
}

function pushVariant(map: Map<string, Variant[]>, key: string, variant: Variant): void {
  const list = map.get(key);
  if (list) list.push(variant);
  else map.set(key, [variant]);
}

function parseTestCarFile(path: string, idx: Indexes): number {
  const wb = XLSX.readFile(path, { raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  if (rows.length === 0) return 0;

  const ex = buildExtractor(Object.keys(rows[0]));
  if (!ex) {
    console.warn(`  Skipping ${path.split(/[\\/]/).pop()}: unrecognized schema.`);
    return 0;
  }

  let added = 0;
  for (const row of rows) {
    const hp = parseInt(String(row[ex.hp]), 10);
    if (!hp || hp <= 0) continue;

    const year = extractYear(row[ex.year]);
    if (Number.isNaN(year)) continue;

    const make = norm(row[ex.make]);
    const model = norm(row[ex.model]);
    if (!make || !model) continue;

    let displNum = ex.displ ? Number(row[ex.displ]) : NaN;
    if (ex.displIsCid && !Number.isNaN(displNum)) displNum *= CID_TO_LITRES;
    const displ = Number.isNaN(displNum) || displNum <= 0 ? '' : displNum.toFixed(1);

    const cylNum = ex.cyl ? parseInt(String(row[ex.cyl]), 10) : NaN;
    const cyl = Number.isNaN(cylNum) || cylNum <= 0 ? '' : String(cylNum);

    const variant: Variant = { model, displ, cyl, hp };
    pushVariant(idx.byMakeYear, `${make}|${year}`, variant);
    if (displ && cyl) pushVariant(idx.byEngineYear, `${displ}|${cyl}|${year}`, variant);
    added++;
  }
  return added;
}

// ---------------------------------------------------------------------------
// 3. Match each car to a horsepower figure
// ---------------------------------------------------------------------------

type MatchTier = 'make+engine+model' | 'engine+model' | 'model+cyl' | 'engine';

interface MatchResult {
  hp: number;
  tier: MatchTier;
}

/** Carline equivalence: the EPA carline is usually a prefix of the fueleconomy
 *  model (which appends drivetrain/trim, e.g. "Sportage" vs "Sportage FWD"). */
function carlineRelated(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

/**
 * Choose a horsepower from candidate variants.
 *  - When a carline is required, prefer rows whose carline matches EXACTLY before
 *    falling back to prefix-related rows (sharper than prefix matching alone).
 *  - Aggregate over DISTINCT horsepower values (not raw rows) so a make/year that
 *    tested one trim more often than another doesn't bias the median. Same-engine
 *    trims the EPA lumps under one carline (e.g. NA + turbo "IMPREZA AWD") then
 *    yield a stable central figure instead of whichever trim was tested most.
 */
function bestHp(
  candidates: Variant[],
  enginePred: (v: Variant) => boolean,
  related: (epaModel: string) => boolean,
  model: string,
  combined: string,
  requireCarline: boolean,
  requireTight: boolean,
): number | null {
  const pool = candidates.filter(enginePred);
  if (pool.length === 0) return null;

  let chosen: number[];
  if (requireCarline) {
    const exact = pool.filter((v) => v.model === model || v.model === combined).map((v) => v.hp);
    chosen = exact.length ? exact : pool.filter((v) => related(v.model)).map((v) => v.hp);
  } else {
    chosen = pool.map((v) => v.hp);
  }
  if (chosen.length === 0) return null;

  const distinct = [...new Set(chosen)];
  if (requireTight && !isTight(distinct)) return null;
  return Math.round(median(distinct));
}

function matchHorsepower(car: Car, idx: Indexes): MatchResult | null {
  const make = norm(car.make);
  const model = norm(car.model);
  const combined = `${make}${model}`; // EPA legacy carlines sometimes embed the brand
  const year = car.year;
  const displ = car.engine.displacement != null ? car.engine.displacement.toFixed(1) : null;
  const cyl = car.engine.cylinders != null ? String(car.engine.cylinders) : null;

  const makeBucket = idx.byMakeYear.get(`${make}|${year}`) ?? [];
  const engineBucket = displ && cyl ? idx.byEngineYear.get(`${displ}|${cyl}|${year}`) ?? [] : [];

  const related = (epaModel: string) =>
    carlineRelated(model, epaModel) || carlineRelated(combined, epaModel);
  const sameEngine = (v: Variant) => v.displ === displ && v.cyl === cyl;
  const sameCyl = (v: Variant) => v.cyl === cyl;

  // Tier 1 — same make + exact engine + carline. Highest confidence (modern files).
  if (displ && cyl) {
    const hp = bestHp(makeBucket, sameEngine, related, model, combined, true, false);
    if (hp != null) return { hp, tier: 'make+engine+model' };
  }

  // Tier 2 — exact engine + carline ACROSS makes. Recovers legacy rows whose make
  // field is the parent company (e.g. "GENERAL MOTORS", "FUJI HEAVY IND"=Subaru).
  // The exact engine + distinctive carline keep cross-make contamination low.
  if (engineBucket.length) {
    const hp = bestHp(engineBucket, () => true, related, model, combined, true, false);
    if (hp != null) return { hp, tier: 'engine+model' };
  }

  // Tier 3 — same make + carline + cylinders (tolerates displacement rounding),
  // accepted only when the readings agree closely.
  if (cyl) {
    const hp = bestHp(makeBucket, sameCyl, related, model, combined, true, true);
    if (hp != null) return { hp, tier: 'model+cyl' };
  }

  // Tier 4 — same make + exact engine, carline renamed; only a single tight cluster.
  if (displ && cyl) {
    const hp = bestHp(makeBucket, sameEngine, related, model, combined, false, true);
    if (hp != null) return { hp, tier: 'engine' };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Building horsepower enrichment from EPA Test Car List Data');
  console.log(`Model years: ${fromYear}–${toYear}${offline ? ' (offline)' : ''}\n`);

  const files = await ensureTestCarFiles();
  if (files.length === 0) {
    console.error(
      'No EPA test-car files available. Run online once, or place files in data/raw/test-car-data/.',
    );
    process.exit(1);
  }

  console.log(`\nParsing ${files.length} EPA file(s)...`);
  const idx: Indexes = { byMakeYear: new Map(), byEngineYear: new Map() };
  let totalRows = 0;
  for (const file of files) {
    const n = parseTestCarFile(file, idx);
    totalRows += n;
    console.log(`  ${file.split(/[\\/]/).pop()}: ${n} rows with horsepower`);
  }
  console.log(`Indexed ${totalRows} engine readings across ${idx.byMakeYear.size} make/year groups.\n`);

  const db = JSON.parse(readFileSync(CARS_PATH, 'utf-8')) as { cars: Car[] };
  const output: Record<string, number> = {};
  const tierCounts: Record<MatchTier, number> = {
    'make+engine+model': 0,
    'engine+model': 0,
    'model+cyl': 0,
    engine: 0,
  };
  let matched = 0;
  let missingEpaId = 0;
  let electricSkipped = 0;

  for (const car of db.cars) {
    if (car.epaId == null) {
      missingEpaId++;
      continue;
    }
    const result = matchHorsepower(car, idx);
    if (result) {
      output[String(car.epaId)] = result.hp;
      tierCounts[result.tier]++;
      matched++;
    } else if (car.engine.fuelType === 'electric') {
      electricSkipped++;
    }
  }

  writeFileSync(HP_OUT, JSON.stringify(output));

  const total = db.cars.length;
  console.log('=== Horsepower enrichment summary ===');
  console.log(`Total vehicles:           ${total}`);
  console.log(`Matched horsepower:       ${matched} (${((matched / total) * 100).toFixed(1)}%)`);
  console.log(`  tier make+engine+model: ${tierCounts['make+engine+model']}`);
  console.log(`  tier engine+model:      ${tierCounts['engine+model']}`);
  console.log(`  tier model+cyl:         ${tierCounts['model+cyl']}`);
  console.log(`  tier engine-only:       ${tierCounts.engine}`);
  console.log(`Electric (no RHP):        ${electricSkipped}`);
  if (missingEpaId) console.log(`Skipped (no epaId):       ${missingEpaId}`);
  console.log(`\nWrote ${HP_OUT} (${Object.keys(output).length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
