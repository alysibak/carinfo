import type { Car } from '../types/car.types.js';

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
    return neighbours.some((n) => gap(hp, n) > 0.35 && mine > atypicality(n, car) + 0.2);
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
