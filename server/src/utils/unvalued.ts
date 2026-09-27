import type { CarSpecs, UnvaluedReason } from '../types/car.types.js';
import { COLLECTOR_NOTE, isCollectorCar } from './collector-cars.js';
import { notRetailedReason } from './not-retailed.js';

/**
 * Why the site does not value a car, or undefined when it does: collector
 * cars trade on auctions, and cars never sold to the public have no used
 * market. Either way the depreciation model's figure would be a price nobody
 * pays, so listings, sorting and the car page show none.
 */
export function unvaluedReason(car: CarSpecs): UnvaluedReason | undefined {
  if (isCollectorCar(car)) {
    return { kind: 'collector', label: 'Collector car', note: COLLECTOR_NOTE };
  }
  const why = notRetailedReason(car);
  if (why) {
    return {
      kind: 'not-retailed',
      label: 'Lease or fleet only',
      note: `Never sold to the public: ${why}. With no used market to price it from, we do not value it or estimate its running costs.`,
    };
  }
  return undefined;
}
