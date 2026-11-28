/**
 * Turn the government files fetch-public-data.ts downloads into the site's
 * recall and complaint records, by model line and model year:
 *
 *   data/recalls-canada.json   Transport Canada's safety and compliance recalls
 *   data/complaints.json       NHTSA's owner complaints, counted by part
 *   data/investigations.json   NHTSA's defect investigations
 *   data/bulletins.json        the makers' service bulletins NHTSA files
 *
 * Each record keeps the government's own identifiers (Transport Canada's recall
 * number, NHTSA's make, model and year), so a visitor can look it up there.
 * A vehicle the site does not list (a heavy-duty pickup, which EPA does not
 * rate) is left out rather than counted against a model it is not.
 *
 * Usage: tsx scripts/build-safety-records.ts <folder with the public data>
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';
import { createGunzip, gunzipSync } from 'zlib';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import { getAllCars, modelLineKey } from '../src/services/car.service.js';
import { govModelIndex } from '../src/utils/gov-models.js';
import { bulletinKind, bulletinSystem, type BulletinKind } from '../src/shared/bulletins.js';

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

/** NHTSA's kinds of investigation, by the first letters of its number. */
const INVESTIGATION_KINDS = /^(PE|EA|RQ|DP|AQ|RP)/;

/** "20190311" or "2019-03-11" → "2019-03-11"; anything else, nothing. */
function isoDay(text: string | undefined): string | undefined {
  const digits = text?.replace(/\D/g, '') ?? '';
  if (digits.length !== 8) return undefined;
  const day = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return Number.isNaN(Date.parse(day)) ? undefined : day;
}

export interface NhtsaInvestigationRecord {
  /** "PE", "EA", "RQ", "DP", "AQ" or "RP". */
  kind: string;
  opened: string;
  closed?: string;
  component: string;
  subject: string;
  summary?: string;
  /** The recall it led to, by NHTSA's campaign number. */
  recall?: string;
}

function investigations(index: ReturnType<typeof govModelIndex>) {
  const path = join(folder, 'nhtsa-investigations.json');
  const file = JSON.parse(readFileSync(path, 'utf8')) as {
    actions: Record<string, Record<string, string>>;
    vehicles: Record<string, string[]>;
  };
  const kept: Record<string, NhtsaInvestigationRecord> = {};
  const byLine: Record<string, string[]> = {};
  let listings = 0;
  let matched = 0;
  const unmatched = new Map<string, number>();
  for (const [key, ids] of Object.entries(file.vehicles)) {
    const [make, model, yearText] = key.split('|');
    const year = Number(yearText);
    listings++;
    const line = index.match(make, model, year);
    if (!line) {
      unmatched.set(`${make} ${model}`, (unmatched.get(`${make} ${model}`) ?? 0) + 1);
      continue;
    }
    matched++;
    for (const id of ids) {
      const action = file.actions[id];
      const kind = INVESTIGATION_KINDS.exec(id)?.[1];
      const opened = isoDay(action?.opened);
      if (!action || !kind || !opened || !action.subject) continue;
      const closed = isoDay(action.closed);
      const recall = action.campaign?.trim();
      const summary = action.summary?.replace(/\s+/g, ' ').trim();
      kept[id] ??= {
        kind,
        opened,
        ...(closed ? { closed } : {}),
        component: (action.component ?? '').split(':')[0].trim() || 'UNKNOWN',
        subject: action.subject.replace(/\s+/g, ' ').trim(),
        ...(summary ? { summary } : {}),
        ...(recall ? { recall } : {}),
      };
      const list = (byLine[`${line}|${year}`] ??= []);
      if (!list.includes(id)) list.push(id);
    }
  }
  for (const list of Object.values(byLine)) {
    list.sort((a, b) => kept[b].opened.localeCompare(kept[a].opened));
  }
  writeFileSync(
    join(DATA, 'investigations.json'),
    JSON.stringify({
      source: 'https://static.nhtsa.gov/odi/ffdd/inv/FLAT_INV.zip',
      builtAt: new Date().toISOString(),
      investigations: kept,
      byLine,
    }),
  );
  console.log(
    `NHTSA investigations: ${Object.keys(kept).length} over ${Object.keys(byLine).length} model years (${matched} of ${listings} make, model and year listings matched)`,
  );
  console.log(`  Most often unmatched: ${top(unmatched)}`);
}

export interface ServiceBulletinRecord {
  /** The maker's own number, which a dealer looks it up by: "19-001". */
  number?: string;
  /** When the maker issued it: "2019-03-01". */
  date?: string;
  /** NHTSA's systems it is filed under: "POWER TRAIN". */
  parts: string[];
  /** NHTSA's summary, cut to about two sentences. */
  summary: string;
  /** A warranty extension or a free repair program, by its own words. */
  kind?: BulletinKind;
}

export interface BulletinYearRecord {
  /** Every bulletin on file for the model year. */
  total: number;
  /** How many name each system, most first. */
  parts: Array<[string, number]>;
  /**
   * Those worth reading, newest first: every warranty extension and free
   * repair program, then the newest on the parts owners complain about most.
   */
  ids: string[];
}

/** Bulletins kept on each of a year's most complained-about parts. */
const BULLETINS_PER_PART = 3;
/** The parts owners complain about most whose bulletins are kept. */
const BULLETIN_PARTS = 3;
/** Warranty extensions and free repair programs kept for a year. */
const BULLETIN_PROGRAMS = 6;
const SUMMARY_CHARACTERS = 320;

/** A summary cut at its last full sentence within the limit, or at a word with "…". */
function shortSummary(text: string, max = SUMMARY_CHARACTERS): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

function bulletins(index: ReturnType<typeof govModelIndex>) {
  const file = JSON.parse(
    gunzipSync(readFileSync(join(folder, 'nhtsa-bulletins.json.gz'))).toString('utf8'),
  ) as {
    bulletins: Record<
      string,
      { number?: string; date?: string; components: string[]; summary: string }
    >;
    vehicles: Record<string, string[]>;
  };
  // The parts owners complain about most, from the complaints just built or main's.
  const complained = JSON.parse(readFileSync(join(DATA, 'complaints.json'), 'utf8')) as {
    byLine: Record<string, { parts: Array<[string, number]> }>;
  };

  const records = new Map<string, ServiceBulletinRecord>();
  const record = (id: string): ServiceBulletinRecord | undefined => {
    if (records.has(id)) return records.get(id);
    const note = file.bulletins[id];
    const summary = note?.summary.replace(/\s+/g, ' ').trim();
    if (!note || !summary) return undefined;
    const date = isoDay(note.date);
    const kind = bulletinKind(summary);
    const made: ServiceBulletinRecord = {
      ...(note.number?.trim() ? { number: note.number.trim() } : {}),
      ...(date ? { date } : {}),
      parts: [...new Set(note.components.map(bulletinSystem))],
      summary,
      ...(kind ? { kind } : {}),
    };
    records.set(id, made);
    return made;
  };

  const byYear = new Map<string, Set<string>>();
  let listings = 0;
  let matched = 0;
  const unmatched = new Map<string, number>();
  for (const [key, ids] of Object.entries(file.vehicles)) {
    const [make, model, yearText] = key.split('|');
    const year = Number(yearText);
    listings++;
    const line = index.match(make, model, year);
    if (!line) {
      unmatched.set(`${make} ${model}`, (unmatched.get(`${make} ${model}`) ?? 0) + ids.length);
      continue;
    }
    matched++;
    const set = byYear.get(`${line}|${year}`) ?? new Set<string>();
    for (const id of ids) if (record(id)) set.add(id);
    byYear.set(`${line}|${year}`, set);
  }

  const newestFirst = (a: string, b: string) =>
    (records.get(b)!.date ?? '').localeCompare(records.get(a)!.date ?? '');
  const kept = new Set<string>();
  const byLine: Record<string, BulletinYearRecord> = {};
  for (const [key, set] of byYear) {
    // A bulletin reissued under the same number is one bulletin: its newest issue.
    const latest = new Map<string, string>();
    for (const id of [...set].sort(newestFirst)) {
      const number = records.get(id)!.number ?? id;
      if (!latest.has(number)) latest.set(number, id);
    }
    const ids = [...latest.values()].sort(newestFirst);
    if (!ids.length) continue;
    const counts = new Map<string, number>();
    for (const id of ids)
      for (const part of records.get(id)!.parts) counts.set(part, (counts.get(part) ?? 0) + 1);
    const parts = [...counts].sort((a, b) => b[1] - a[1]);
    // The parts owners complain about most that have bulletins; else the parts with most.
    const complainedOf = (complained.byLine[key]?.parts ?? [])
      .map(([part]) => part)
      .filter((part) => counts.has(part));
    const focus = (complainedOf.length ? complainedOf : parts.map(([part]) => part)).slice(
      0,
      BULLETIN_PARTS,
    );
    const chosen = ids.filter((id) => records.get(id)!.kind).slice(0, BULLETIN_PROGRAMS);
    for (const part of focus) {
      chosen.push(
        ...ids
          .filter((id) => !chosen.includes(id) && records.get(id)!.parts.includes(part))
          .slice(0, BULLETINS_PER_PART),
      );
    }
    chosen.sort(newestFirst);
    for (const id of chosen) kept.add(id);
    byLine[key] = { total: ids.length, parts, ids: chosen };
  }

  const out: Record<string, ServiceBulletinRecord> = {};
  let newest = '';
  for (const id of kept) {
    const made = records.get(id)!;
    out[id] = { ...made, summary: shortSummary(made.summary) };
    if ((made.date ?? '') > newest) newest = made.date!;
  }
  const body = JSON.stringify({
    source: 'https://static.nhtsa.gov/odi/ffdd/tsbs/FLAT_TSBS.zip',
    builtAt: new Date().toISOString(),
    ...(newest ? { newest } : {}),
    bulletins: out,
    byLine,
  });
  writeFileSync(join(DATA, 'bulletins.json'), body);
  const programs = Object.values(out).filter((b) => b.kind).length;
  console.log(
    `NHTSA service bulletins: ${kept.size} kept of ${records.size} over ${Object.keys(byLine).length} model years, ${programs} warranty extensions or programs, newest ${newest || 'unknown'}, ${(body.length / 1e6).toFixed(1)} MB (${matched} of ${listings} make, model and year listings matched)`,
  );
  console.log(`  Most often unmatched: ${top(unmatched)}`);
}

async function main(): Promise<void> {
  if (!existsSync(folder)) throw new Error(`No public data at ${folder}`);
  const index = govModelIndex(getAllCars(), modelLineKey);
  if (existsSync(join(folder, 'canada-recalls'))) await canadianRecalls(index);
  if (existsSync(join(folder, 'nhtsa-complaints.json'))) complaints(index);
  if (existsSync(join(folder, 'nhtsa-investigations.json'))) investigations(index);
  if (existsSync(join(folder, 'nhtsa-bulletins.json.gz'))) bulletins(index);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
