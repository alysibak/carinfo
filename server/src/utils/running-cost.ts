import type { Car } from '../types/car.types.js';
import { isCollectorCar } from './collector-cars.js';
import { computeOwnershipEconomics } from './ownership-economics.js';

/**
 * Each car's yearly running cost (energy, insurance, maintenance, tires and
 * registration; Ontario baseline, CAD) for "cheapest to own" searches. The
 * car page computes its own for the reader's region. About 2 s for the corpus,
 * so it is done when the database is built, not per request. Collector cars
 * carry none: their figures are not shown.
 */
export function withRunningCosts(cars: Car[]): Car[] {
  return cars.map((car) => {
    if (isCollectorCar(car)) return car;
    const { energy, total } = computeOwnershipEconomics(car, []).annualCost;
    // A hydrogen car's fuel has no price on file: its total leaves fuel out,
    // and would rank it among the cheapest to run.
    return total == null || energy == null ? car : { ...car, runningCostCad: total };
  });
}
