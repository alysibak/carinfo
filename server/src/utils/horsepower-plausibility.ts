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
