import type { Car } from '../types/car.types.js';
import { applyHorsepowerCorrections } from './horsepower-corrections.js';
import { refreshShoppingSegment } from './vehicle-taxonomy-apply.js';
import { isLuxuryBrand } from './vehicle-taxonomy.js';

/**
 * Whether an EPA Test Car List "Rated Horsepower" figure can be a real rating.
 *
 * That list is the source of most horsepower on the site, and a handful of its
 * rows carry placeholders or mis-keyed values: 999 (a sentinel; an Audi TT RS
 * showed "999 hp"), 1 (a 2026 Ford Bronco Sport showed "1 hp"), and one- or
 * two-digit figures on multi-litre engines (the 2021 Mercedes C300 at 11 hp,
 * the 2010 Cayenne S at 35). Across the corpus every genuine rating sits at or
 * above 30 hp per litre and every bad one at or below 18, so the per-litre
 * bounds below have wide margins on both sides. The upper bound still admits
 * the Bugatti Chiron (1,500 hp from 8.0 L) and hybrid hypercars.
 *
 * The 40 hp floor also drops the BMW i3 with Range Extender's rating, which is
 * its 0.6 L generator (11–38 hp), not the 170 hp motor that drives the car.
 */
export function isPlausibleRatedHorsepower(hp: number, displacementL?: number | null): boolean {
  if (!Number.isFinite(hp) || hp < 40 || hp > 2000) return false;
  if (hp === 999) return false;
  if (displacementL != null && displacementL > 0) {
    const perLitre = hp / displacementL;
    if (perLitre < 20 || perLitre > 300) return false;
  }
  return true;
}

/**
 * EPA's test-car list is matched to cars by displacement and cylinders, not by
 * forced induction (scripts/build-horsepower-enrichment.ts). Where one model
 * year offers the same engine size with and without a turbo, the turbo car
 * could take the naturally aspirated rating: the 2005 Subaru Legacy GT showed
 * the 2.5i's 168 hp instead of 250, the Civic Type R the base car's 150. A
 * turbo or supercharged car rated no higher than a naturally aspirated sibling
 * of the same size, fuel and model year loses its rating, so it reads "not on
 * file" rather than a figure that is wrong.
 */
export function dropInductionMismatchedHorsepower(cars: Car[]): { cars: Car[]; dropped: number } {
  const key = (c: Car) =>
    [c.make, c.model, c.year, c.engine.displacement, c.engine.fuelType].join('|');
  const naturalBest = new Map<string, number>();
  for (const car of cars) {
    const hp = car.engine.horsepower;
    if (car.engine.aspiration || hp == null || !car.engine.displacement) continue;
    naturalBest.set(key(car), Math.max(naturalBest.get(key(car)) ?? 0, hp));
  }

  let dropped = 0;
  const out = cars.map((car) => {
    const hp = car.engine.horsepower;
    if (!car.engine.aspiration || hp == null) return car;
    if (car.provenance?.['engine.horsepower'] !== 'curated') return car;
    const natural = naturalBest.get(key(car));
    if (natural == null || hp > natural) return car;
    dropped++;
    const { horsepower: _hp, ...engine } = car.engine;
    const { 'engine.horsepower': _source, ...provenance } = car.provenance;
    return { ...car, engine, provenance };
  });
  return { cars: out, dropped };
}

/** "Tacoma 4WD" and "Tacoma 2WD" are one model family; drive and doors are not the engine. */
function modelFamily(model: string): string {
  return model
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\b(2wd|4wd|awd|fwd|rwd|4x4|ffv|\d ?dr|\d-door)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Drop a rating two different engines of one model and year share.
 *
 * The rating matcher's third tier accepted any engine with the same cylinder
 * count when the listing's own engine was not in EPA's test-car file, so an
 * untested engine took a tested sibling's figure: the 2013 F-150 5.0 carries
 * the 6.2's 415 hp, a 2013 Tundra 4.6 the 5.7's 381, a 2010 Corolla 2.4 the
 * 1.8's 132. Which of the pair is real cannot be told from the ratings, so
 * both read "not on file" until the file is rebuilt with the fixed matcher.
 */
export function dropRatingsSharedAcrossEngines(cars: Car[]): { cars: Car[]; dropped: number } {
  // Cylinders are not part of the key: the 2012 Journey's 2.4 four took the
  // 3.6 V6's 283 hp.
  const key = (c: Car) =>
    [c.make, modelFamily(c.model), c.year, c.engine.aspiration ?? '', c.engine.fuelType].join('|');
  const curated = (c: Car) =>
    c.engine.horsepower != null &&
    !!c.engine.displacement &&
    c.provenance?.['engine.horsepower'] === 'curated';

  const displacements = new Map<string, Set<number>>();
  for (const car of cars) {
    if (!curated(car)) continue;
    const k = `${key(car)}|${car.engine.horsepower}`;
    const set = displacements.get(k) ?? new Set<number>();
    set.add(car.engine.displacement!);
    displacements.set(k, set);
  }

  let dropped = 0;
  const out = cars.map((car) => {
    if (!curated(car)) return car;
    if ((displacements.get(`${key(car)}|${car.engine.horsepower}`)?.size ?? 0) < 2) return car;
    dropped++;
    const { horsepower: _hp, ...engine } = car.engine;
    const { 'engine.horsepower': _source, ...provenance } = car.provenance;
    return { ...car, engine, provenance };
  });
  return { cars: out, dropped };
}

/**
 * How far a rating's output per litre sits from what its kind of engine
 * typically makes: big naturally aspirated V8s make less per litre than small
 * fours, and forced induction makes more.
 */
function atypicality(hp: number, car: Car): number {
  const litres = car.engine.displacement!;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const typical =
    car.engine.fuelType === 'diesel'
      ? 55
      : car.engine.aspiration
        ? clamp(115 - 5 * (litres - 2), 80, 120)
        : clamp(85 - 5 * (litres - 2), 55, 85);
  return Math.abs(Math.log(hp / litres / typical));
}

/**
 * Drop a rating out of line with the same engine in the adjacent model years.
 *
 * The matcher's last tier took any test car of the same make and engine size
 * when a listing's own carline was not in the file, and the cross-make tier
 * any carline that shared a name: the 2010 Expedition 5.4 carries the Shelby
 * GT500's supercharged 540 hp, a 2008 Titan and Armada 417 hp against 305–317
 * the years either side, a 2019 Corvette the ZR1's 638. An engine rarely gains
 * or loses a fifth of its output from one model year to the next without a
 * new engine code, so:
 *
 * - a rating that agrees (within 10%) with the nearest rated year on either
 *   side (up to two years away) is kept;
 * - one that differs by over 20% from both sides, when those agree with each
 *   other, is dropped, unless it is plainly the more typical figure for its
 *   engine (the 2013 Avenger 2.4's 178 hp between two borrowed 283s);
 * - with a rated year on one side only, a gap over 35% drops the rating if it
 *   is clearly the less typical one for its kind of engine. Engines do change
 *   within a model (the EuroVan's VR6 went from 140 to 201 hp in 2001), so a
 *   smaller gap with nothing to break the tie is left alone.
 *
 * Hybrids are left alone: EPA rates some by engine and some by system output.
 */
export function dropYearOverYearOutliers(cars: Car[]): { cars: Car[]; dropped: number } {
  const eligible = (c: Car) =>
    c.engine.horsepower != null &&
    !!c.engine.displacement &&
    c.provenance?.['engine.horsepower'] === 'curated' &&
    (c.engine.fuelType === 'gasoline' || c.engine.fuelType === 'diesel');
  const key = (c: Car) =>
    [
      c.make,
      modelFamily(c.model),
      c.engine.displacement,
      c.engine.cylinders,
      c.engine.aspiration ?? '',
      c.engine.fuelType,
    ].join('|');

  const byYear = new Map<string, Map<number, number[]>>();
  for (const car of cars) {
    if (!eligible(car)) continue;
    const years = byYear.get(key(car)) ?? new Map<number, number[]>();
    years.set(car.year, [...(years.get(car.year) ?? []), car.engine.horsepower!]);
    byYear.set(key(car), years);
  }
  const median = (hps: number[]) => [...hps].sort((a, b) => a - b)[Math.floor(hps.length / 2)];
  const gap = (a: number, b: number) => Math.abs(a / b - 1);

  const isOutlier = (car: Car): boolean => {
    const hp = car.engine.horsepower!;
    const years = byYear.get(key(car))!;
    // The nearest rated year on each side, up to two years away.
    const nearest = (step: number) => years.get(car.year + step) ?? years.get(car.year + 2 * step);
    const neighbours = [nearest(-1), nearest(1)]
      .filter((list): list is number[] => list != null)
      .map(median);
    if (neighbours.length === 0 || neighbours.some((n) => gap(hp, n) <= 0.1)) return false;
    const mine = atypicality(hp, car);
    if (neighbours.length === 2) {
      const [prev, next] = neighbours;
      if (gap(prev, next) <= 0.1) {
        const theirs = atypicality(median([prev, next]), car);
        return gap(hp, prev) > 0.2 && gap(hp, next) > 0.2 && mine > theirs - 0.2;
      }
    }
    return neighbours.some((n) => gap(hp, n) > 0.35 && mine > atypicality(n, car) + 0.15);
  };

  let dropped = 0;
  const out = cars.map((car) => {
    if (!eligible(car) || !isOutlier(car)) return car;
    dropped++;
    const { horsepower: _hp, ...engine } = car.engine;
    const { 'engine.horsepower': _source, ...provenance } = car.provenance;
    return { ...car, engine, provenance };
  });
  return { cars: out, dropped };
}

/**
 * Fill a missing rating from the same engine in the same model.
 *
 * EPA's test-car file rates one configuration of an engine, so a 4WD, FFV or
 * later-year listing of the same engine often has no figure of its own; the
 * 7,547 listings restored from EPA's data in 2026 have none at all. A listing
 * takes the rating of the same engine (size, cylinders, induction and fuel) in
 * the same model family: from the same year when a sibling has one, else from
 * the adjacent years, else from two years either side. Where the candidates
 * disagree by more than 10% the engine probably changed, and the listing stays
 * "not on file". Filled figures are labelled estimates. Run it after the
 * clean-up passes, so a dropped rating is not copied.
 */
export function fillHorsepowerFromSiblings(cars: Car[]): { cars: Car[]; filled: number } {
  const key = (c: Car) =>
    [
      c.make,
      modelFamily(c.model),
      c.engine.displacement,
      c.engine.cylinders,
      c.engine.aspiration ?? '',
      c.engine.fuelType,
    ].join('|');
  const rated = new Map<string, Map<number, number[]>>();
  for (const car of cars) {
    const hp = car.engine.horsepower;
    if (hp == null || !car.engine.displacement) continue;
    if (car.provenance?.['engine.horsepower'] !== 'curated') continue;
    const years = rated.get(key(car)) ?? new Map<number, number[]>();
    years.set(car.year, [...(years.get(car.year) ?? []), hp]);
    rated.set(key(car), years);
  }

  let filled = 0;
  const out = cars.map((car) => {
    if (car.engine.horsepower != null || !car.engine.displacement) return car;
    const years = rated.get(key(car));
    if (!years) return car;
    const around = (offset: number) => [
      ...(years.get(car.year - offset) ?? []),
      ...(offset ? (years.get(car.year + offset) ?? []) : []),
    ];
    const candidates = [0, 1, 2].map(around).find((list) => list.length > 0);
    if (!candidates) return car;
    const sorted = [...candidates].sort((a, b) => a - b);
    if (sorted[sorted.length - 1] / sorted[0] > 1.1) return car;
    filled++;
    return {
      ...car,
      // The lower middle: between two years, the one that does not overstate.
      engine: { ...car.engine, horsepower: sorted[(sorted.length - 1) >> 1] },
      provenance: { ...car.provenance, 'engine.horsepower': 'estimated' as const },
    };
  });
  return { cars: out, filled };
}

/**
 * Where a naturally aspirated engine can make 95 hp a litre: sports cars and
 * luxury makes (an S2000, a GT3, a Maserati V8). Not a segment the rating
 * itself decided: a sedan is a "sport sedan" by the very output in question.
 */
const HIGH_OUTPUT_SEGMENTS = new Set(['sports-car', 'muscle', 'supercar']);
/**
 * Names that say the engine is boosted where EPA's record does not (a BMW 35i,
 * a Kompressor, a GTI), or a high-revving performance engine (a 2006–11 Civic
 * Si makes 197 hp from 2.0 litres).
 */
const BOOSTED_OR_PERFORMANCE_NAME =
  /\b(\d{2}[id]|kompressor|turbo|tsi|tfsi|ecoboost|supercharged|gti|si|type[- ]?[rs]|srt[- ]?\d?|sti|wrx|se-r|spec v|mazdaspeed|nismo|ralliart|svt)\b/i;

/**
 * Ratings no engine of that kind makes, so borrowed from another. A
 * naturally aspirated engine in an everyday car above 94 hp a litre (a 2014
 * F-150 5.0 at 600 hp, a Flex 3.5 at the EcoBoost's 355, a Mazda5 at 254),
 * or a turbo or supercharged engine from 2008 on below 70 (a Lexus NX 300 at
 * 112 hp, a Shelby GT500 at the GT's 300, a Forester XT at the 2.5's 173).
 */
export function dropImplausibleOutput(cars: Car[]): { cars: Car[]; dropped: number } {
  let dropped = 0;
  const out = cars.map((car) => {
    const hp = car.engine.horsepower;
    const litres = car.engine.displacement ?? 0;
    if (hp == null || litres <= 0 || car.engine.fuelType !== 'gasoline') return car;
    const perLitre = hp / litres;
    const boosted = !!car.engine.aspiration;
    const implausible = boosted
      ? car.year >= 2008 && perLitre < 70
      : litres >= 1.4 &&
        perLitre > 94 &&
        !HIGH_OUTPUT_SEGMENTS.has(car.shoppingSegment ?? '') &&
        !isLuxuryBrand(car.make) &&
        !BOOSTED_OR_PERFORMANCE_NAME.test(`${car.model} ${car.variant ?? ''}`);
    if (!implausible) return car;
    dropped++;
    const { horsepower: _hp, ...engine } = car.engine;
    const { 'engine.horsepower': _source, ...provenance } = car.provenance ?? {};
    return { ...car, engine, provenance };
  });
  return { cars: out, dropped };
}

export interface HorsepowerPassReport {
  induction: number;
  shared: number;
  yearOverYear: number;
  /** Ratings no engine of that kind makes (dropImplausibleOutput). */
  implausible: number;
  /** Ratings set to the manufacturer's figure (horsepower-corrections.ts). */
  corrected: number;
  filled: number;
}

/**
 * The corpus-wide horsepower passes, in order: drop borrowed ratings, then
 * fill gaps from the ratings that remain. Cars whose figure changed get their
 * shopping segment re-derived, since normalization placed them with the old
 * one.
 */
export function cleanCorpusHorsepower(cars: Car[]): { cars: Car[]; report: HorsepowerPassReport } {
  const induction = dropInductionMismatchedHorsepower(cars);
  const shared = dropRatingsSharedAcrossEngines(induction.cars);
  const yearOverYear = dropYearOverYearOutliers(shared.cars);
  const implausible = dropImplausibleOutput(yearOverYear.cars);
  // Manufacturer ratings last, so no pass can drop them, and before the fill
  // so unrated siblings copy the right figure.
  const corrections = applyHorsepowerCorrections(implausible.cars);
  const fill = fillHorsepowerFromSiblings(corrections.cars);
  const out = fill.cars.map((car, i) =>
    car.engine.horsepower === cars[i].engine.horsepower ? car : refreshShoppingSegment(car),
  );
  return {
    cars: out,
    report: {
      induction: induction.dropped,
      shared: shared.dropped,
      yearOverYear: yearOverYear.dropped,
      implausible: implausible.dropped,
      corrected: corrections.corrected,
      filled: fill.filled,
    },
  };
}
