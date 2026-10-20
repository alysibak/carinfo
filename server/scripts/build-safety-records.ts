/**
 * Turn the government files fetch-public-data.ts downloads into the site's
 * recall and complaint records, by model line and model year:
 *
 *   data/recalls-canada.json   Transport Canada's safety and compliance recalls
 *   data/complaints.json       NHTSA's owner complaints, counted by part
 *
 * Each record keeps the government's own identifiers (Transport Canada's recall
 * number, NHTSA's make, model and year), so a visitor can look it up there.
 * A vehicle the site does not list (a heavy-duty pickup, which EPA does not
 * rate) is left out rather than counted against a model it is not.
 *
 * Usage: tsx scripts/build-safety-records.ts <folder with the public data>
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';
import { createGunzip } from 'zlib';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import { getAllCars, modelLineKey } from '../src/services/car.service.js';
import { govModelIndex } from '../src/utils/gov-models.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(scriptDir, '..', 'data');
const folder = resolve(process.argv[2] ?? join(DATA, 'public'));
const FIRST_YEAR = 1995;

/** Passenger vehicles in Transport Canada's categories; buses, trailers and seats are not. */
const PASSENGER = new Set(['Car', 'SUV', 'Light Truck & Van', 'Minivan']);
/**
 * Recalls in the plain sense: safety and compliance, by the maker or ordered by
 * Transport Canada. Service campaigns, superseded notices, audits and those
 * Transport Canada judged inconsequential are not.
 */
const RECALL_TYPES = /^(?:Safety|Compliance) (?:Mfr|TC)$/;

export interface CanadianRecall {
  date: string;
  /** "Brakes", "Airbag", as Transport Canada files it. */
  system: string;
  kind: 'safety' | 'compliance';
  /** Vehicles affected in Canada, as Transport Canada records it. */
  units?: number;
  /** "Issue: ... Safety risk: ... Corrective action: ...", in Transport Canada's words. */
  summary: string;
}

/** "FORD F-250 SD (812), RAM 2500 (640)": what a reviewer checks is rightly left out. */
function top(counts: Map<string, number>, n = 25): string {
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => `${name} (${count})`)
    .join(', ');
}

async function canadianRecalls(index: ReturnType<typeof govModelIndex>) {
  const path = join(folder, 'canada-recalls', 'vrdb_full_monthly.csv.gz');
  const recalls: Record<string, CanadianRecall> = {};
  const byLine: Record<string, string[]> = {};
  let rows = 0;
  let matched = 0;
  const unmatched = new Map<string, number>();
  const parser = createReadStream(path)
    .pipe(createGunzip())
    .pipe(parse({ columns: true, bom: true, relax_column_count: true, relax_quotes: true }));
  for await (const row of parser as AsyncIterable<Record<string, string>>) {
    const year = Math.round(Number(row.YEAR));
    if (!PASSENGER.has(row.CATEGORY_ETXT) || !RECALL_TYPES.test(row.NOTIFICATION_TYPE_ETXT)) {
      continue;
    }
    if (!(year >= FIRST_YEAR) || !row.RECALL_NUMBER_NUM) continue;
    rows++;
    const line = index.match(row.MAKE_NAME_NM, row.MODEL_NAME_NM, year);
    if (!line) {
      const name = `${row.MAKE_NAME_NM} ${row.MODEL_NAME_NM}`;
      unmatched.set(name, (unmatched.get(name) ?? 0) + 1);
      continue;
    }
    matched++;
    const number = row.RECALL_NUMBER_NUM.trim();
    const units = Number(row.UNIT_AFFECTED_NBR) || 0;
    const existing = recalls[number];
    if (existing) {
      if (units > (existing.units ?? 0)) existing.units = units;
    } else {
      recalls[number] = {
        date: row.RECALL_DATE_DTE,
        system: row.SYSTEM_TYPE_ETXT === 'Not Entered' ? 'Other' : row.SYSTEM_TYPE_ETXT,
        kind: row.NOTIFICATION_TYPE_ETXT.startsWith('Safety') ? 'safety' : 'compliance',
        ...(units > 0 ? { units } : {}),
        summary: row.COMMENT_ETXT.replace(/\r/g, '').trim(),
      };
    }
    const key = `${line}|${year}`;
    const list = (byLine[key] ??= []);
    if (!list.includes(number)) list.push(number);
  }
  for (const list of Object.values(byLine)) {
    list.sort((a, b) => recalls[b].date.localeCompare(recalls[a].date));
  }
  writeFileSync(
    join(DATA, 'recalls-canada.json'),
    JSON.stringify({
      source: 'https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d',
      builtAt: new Date().toISOString(),
      recalls,
      byLine,
    }),
  );
  console.log(
    `Canadian recalls: ${Object.keys(recalls).length} recalls over ${Object.keys(byLine).length} model years (${matched} of ${rows} passenger rows matched to the site's models)`,
  );
  console.log(`  Most often unmatched: ${top(unmatched)}`);
}

export interface ComplaintSummary {
  complaints: number;
  crashes: number;
  fires: number;
  injuries: number;
  deaths: number;
  /** The parts complained of most, by NHTSA's names, with their counts. */
  parts: Array<[string, number]>;
}

function complaints(index: ReturnType<typeof govModelIndex>) {
  const path = join(folder, 'nhtsa-complaints.json');
  const { counts } = JSON.parse(readFileSync(path, 'utf8')) as {
    counts: Record<string, Omit<ComplaintSummary, 'parts'> & { parts: Record<string, number> }>;
  };
  const byLine: Record<string, ComplaintSummary & { names: string[] }> = {};
  let total = 0;
  let matched = 0;
  const unmatched = new Map<string, number>();
  for (const [key, count] of Object.entries(counts)) {
    const [make, model, yearText] = key.split('|');
    const year = Number(yearText);
    total += count.complaints;
    const line = index.match(make, model, year);
    if (!line) {
      unmatched.set(
        `${make} ${model}`,
        (unmatched.get(`${make} ${model}`) ?? 0) + count.complaints,
      );
      continue;
    }
    matched += count.complaints;
    // Several of NHTSA's names can be one model line: "SILVERADO" and "SILVERADO 1500".
    const summary = (byLine[`${line}|${year}`] ??= {
      complaints: 0,
      crashes: 0,
      fires: 0,
      injuries: 0,
      deaths: 0,
      parts: [],
      names: [],
    });
    summary.complaints += count.complaints;
    summary.crashes += count.crashes;
    summary.fires += count.fires;
    summary.injuries += count.injuries;
    summary.deaths += count.deaths;
    summary.names.push(`${make}|${model}`);
    const parts = new Map(summary.parts);
    for (const [part, n] of Object.entries(count.parts))
      parts.set(part, (parts.get(part) ?? 0) + n);
    summary.parts = [...parts];
  }
  for (const summary of Object.values(byLine)) {
    summary.parts = summary.parts
      .filter(([part]) => part !== 'UNKNOWN OR OTHER' && part !== 'UNKNOWN')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }
  writeFileSync(
    join(DATA, 'complaints.json'),
    JSON.stringify({
      source: 'https://static.nhtsa.gov/odi/ffdd/cmpl/FLAT_CMPL.zip',
      builtAt: new Date().toISOString(),
      byLine,
    }),
  );
  console.log(
    `NHTSA complaints: ${matched} of ${total} matched to the site's models (${((100 * matched) / total).toFixed(1)}%), ${Object.keys(byLine).length} model years`,
  );
  console.log(`  Most often unmatched: ${top(unmatched)}`);
}

async function main(): Promise<void> {
  if (!existsSync(folder)) throw new Error(`No public data at ${folder}`);
  const index = govModelIndex(getAllCars(), modelLineKey);
  if (existsSync(join(folder, 'canada-recalls'))) await canadianRecalls(index);
  if (existsSync(join(folder, 'nhtsa-complaints.json'))) complaints(index);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
