/**
 * Report how NHTSA's tested vehicles match the site's cars: how many tests
 * map to a model line, which make/model groups do not (and why), coverage by
 * model year, and the largest unmatched groups. Re-applies matching on
 * getAllCars() so it reflects the current gov-models / nhtsa-ratings rules,
 * not whatever cars-ready.json was built with.
 *
 * Usage: npm run audit:nhtsa
 */
import { getAllCars, modelLineKey } from '../src/services/car.service.js';
import { govModelIndex } from '../src/utils/gov-models.js';
import {
  loadNhtsaTests,
  testedConfiguration,
  testsDescribing,
  withNhtsaRatings,
  type NhtsaTest,
} from '../src/utils/nhtsa-ratings.js';

const HEAVY_DUTY =
  /\b(?:[2-5]500(?:hd)?|3500|4500|5500|f-2\d0|f-3\d0|f-4\d0|f-5\d0|super ?duty|\bhd\b|\bsd\b)\b/i;
const COMMERCIAL_MAKE = /^(?:freightliner|workhorse|navistar|international|brightDrop|brightdrop)$/i;

type UnmatchedReason =
  | 'heavy-duty / not in EPA corpus'
  | 'commercial / specialty make'
  | 'make not on site'
  | 'no model year on site'
  | 'name not mapped to a site line'
  | 'other';

interface UnmatchedGroup {
  make: string;
  model: string;
  count: number;
  years: number[];
  reason: UnmatchedReason;
  sample: string;
}

function likelyReason(test: NhtsaTest, cars: ReturnType<typeof getAllCars>): UnmatchedReason {
  if (COMMERCIAL_MAKE.test(test.make)) return 'commercial / specialty make';
  if (HEAVY_DUTY.test(test.model) || HEAVY_DUTY.test(test.tested)) {
    return 'heavy-duty / not in EPA corpus';
  }
  const makeLower = test.make.toLowerCase();
  const makeCars = cars.filter((c) => {
    const a = c.make.toLowerCase();
    return (
      a === makeLower ||
      a.replace(/-/g, ' ') === makeLower.replace(/-/g, ' ') ||
      (makeLower.startsWith('mercedes') && a.startsWith('mercedes'))
    );
  });
  if (!makeCars.length) return 'make not on site';
  if (!makeCars.some((c) => c.year === test.year)) return 'no model year on site';
  return 'name not mapped to a site line';
}

function main(): void {
  const cars = getAllCars();
  const tests = loadNhtsaTests();
  const index = govModelIndex(cars, modelLineKey);

  const matchedTests = tests.filter((t) => index.match(t.make, t.model, t.year));
  const unmatchedTests = tests.filter((t) => !index.match(t.make, t.model, t.year));

  console.log('=== NHTSA tested vehicles ===');
  console.log(`Rated vehicles (tests): ${tests.length}`);
  console.log(
    `Matched to a site model line: ${matchedTests.length} (${pct(matchedTests.length, tests.length)})`,
  );
  console.log(
    `Unmatched: ${unmatchedTests.length} (${pct(unmatchedTests.length, tests.length)})`,
  );

  const groups = new Map<string, UnmatchedGroup>();
  for (const test of unmatchedTests) {
    const key = `${test.make}|${test.model}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
      if (!existing.years.includes(test.year)) existing.years.push(test.year);
      continue;
    }
    groups.set(key, {
      make: test.make,
      model: test.model,
      count: 1,
      years: [test.year],
      reason: likelyReason(test, cars),
      sample: test.tested,
    });
  }

  const byReason = new Map<string, number>();
  for (const g of groups.values()) {
    byReason.set(g.reason, (byReason.get(g.reason) ?? 0) + g.count);
  }
  console.log('\n=== Unmatched tests by likely reason ===');
  for (const [reason, count] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${count}\t${reason}`);
  }

  const top = [...groups.values()].sort(
    (a, b) => b.count - a.count || a.make.localeCompare(b.make) || a.model.localeCompare(b.model),
  );
  console.log('\n=== Top 30 unmatched make/model groups ===');
  for (const g of top.slice(0, 30)) {
    const years = [...g.years].sort((a, b) => a - b);
    console.log(
      `${g.count}\t${g.make} | ${g.model}\t(${years[0]}–${years[years.length - 1]}, ${g.reason})\t e.g. ${g.sample}`,
    );
  }

  const { cars: ratedCars, rated, described } = withNhtsaRatings(
    cars,
    tests,
    modelLineKey,
    index.match,
  );

  const from2011 = ratedCars.filter((c) => c.year >= 2011);
  const from2015 = ratedCars.filter((c) => c.year >= 2015);
  const overall2015 = from2015.filter((c) => c.safetyRating?.overall);
  const overall2011 = from2011.filter((c) => c.safetyRating?.overall);

  console.log('\n=== Site coverage (after current matching) ===');
  console.log(
    `Cars 2011+: ${from2011.length}; described by a test: ${described}; with overall stars: ${rated}`,
  );
  console.log(
    `Cars 2015+: ${from2015.length}; with overall: ${overall2015.length} (${pct(overall2015.length, from2015.length)})`,
  );
  console.log(
    `Cars 2011+: with overall: ${overall2011.length} (${pct(overall2011.length, from2011.length)})`,
  );

  const byYear = new Map<number, { total: number; overall: number; described: number }>();
  for (const car of ratedCars.filter((c) => c.year >= 2011)) {
    const row = byYear.get(car.year) ?? { total: 0, overall: 0, described: 0 };
    row.total++;
    if (car.safetyRating?.nhtsaIds?.length) row.described++;
    if (car.safetyRating?.overall) row.overall++;
    byYear.set(car.year, row);
  }
  console.log('\n=== Coverage by model year (2011+) ===');
  console.log('year\tcars\toverall\tpct\tdescribed');
  for (const year of [...byYear.keys()].sort((a, b) => a - b)) {
    const row = byYear.get(year)!;
    console.log(
      `${year}\t${row.total}\t${row.overall}\t${pct(row.overall, row.total)}\t${row.described}`,
    );
  }

  // Body/drive/version misses among cars whose line matched that year.
  const byLine = new Map<string, Array<{ config: ReturnType<typeof testedConfiguration>; rating: NhtsaTest }>>();
  for (const test of tests) {
    const line = index.match(test.make, test.model, test.year);
    if (!line) continue;
    const key = `${line}|${test.year}`;
    const list = byLine.get(key) ?? [];
    list.push({
      config: testedConfiguration({
        VehicleId: test.id,
        VehicleDescription: test.tested,
        Make: test.make,
        Model: test.model,
        ModelYear: test.year,
      }),
      rating: test,
    });
    byLine.set(key, list);
  }
  let lineNoTest = 0;
  let bodyDriveMiss = 0;
  let matchedNoOverall = 0;
  for (const car of from2015) {
    const candidates = byLine.get(`${modelLineKey(car)}|${car.year}`);
    if (!candidates) {
      lineNoTest++;
      continue;
    }
    const chosen = testsDescribing(car, candidates);
    if (!chosen.length) {
      bodyDriveMiss++;
      continue;
    }
    if (!chosen.some((t) => t.rating.overall)) matchedNoOverall++;
  }
  console.log('\n=== 2015+ cars without overall, by stage ===');
  console.log(`No matched tests for line/year: ${lineNoTest}`);
  console.log(`Line matched, body/drive/version miss: ${bodyDriveMiss}`);
  console.log(`Described but NHTSA published no overall: ${matchedNoOverall}`);
  console.log(
    `With overall: ${overall2015.length} / ${from2015.length} (${pct(overall2015.length, from2015.length)})`,
  );
}

function pct(n: number, d: number): string {
  return d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a';
}

main();
