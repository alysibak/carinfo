import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars, searchCars } from '../services/car.service.js';
import { getCarDashboard } from '../services/dashboard.service.js';
import { findSimilarCars } from './similar-vehicles.js';
import { notRetailedReason } from './not-retailed.js';

const find = (pred: (c: Car) => boolean) => getAllCars().find(pred);

describe('cars never sold to the public', () => {
  it('recognises leased, fleet and postal cars', () => {
    const cases: Array<[string, (c: Car) => boolean]> = [
      ['GM EV1', (c) => /^EV1$/.test(c.model)],
      ['Honda EV Plus', (c) => c.make === 'Honda' && /^EV Plus/.test(c.model)],
      ['Honda Fit EV', (c) => c.make === 'Honda' && /^Fit EV/.test(c.model)],
      ['Honda Clarity EV', (c) => c.make === 'Honda' && /^Clarity EV/.test(c.model)],
      ['Honda Clarity FCV', (c) => c.make === 'Honda' && /^Clarity FCV/.test(c.model)],
      ['Hyundai Tucson Fuel Cell', (c) => /^Tucson Fuel Cell/.test(c.model)],
      ['Ford Ranger EV', (c) => /^Ranger/.test(c.model) && c.engine.fuelType === 'electric'],
      ['Chrysler EPIC', (c) => /Caravan/.test(c.model) && c.engine.fuelType === 'electric'],
      ['USPS Explorer', (c) => /USPS/.test(c.model)],
      ['2011 smart ED', (c) => c.make === 'smart' && /electric/.test(c.model) && c.year === 2011],
      ['BYD e6', (c) => c.make === 'BYD'],
      ['Lordstown Endurance', (c) => c.make === 'Lordstown'],
      ['Motional robotaxi', (c) => /Robo taxi/.test(c.model)],
    ];
    for (const [label, pred] of cases) {
      const car = find(pred);
      expect(car, `${label} is on file`).toBeDefined();
      expect(notRetailedReason(car!), label).toBeDefined();
      expect(car!.price, label).toBeUndefined();
      expect(car!.runningCostCad, label).toBeUndefined();
    }
  });

  it('leaves the cars that were sold alone', () => {
    const sold: Array<[string, (c: Car) => boolean]> = [
      ['2011 Nissan Leaf', (c) => c.make === 'Nissan' && c.model === 'Leaf' && c.year === 2011],
      ['2013 smart ED', (c) => c.make === 'smart' && /electric/.test(c.model) && c.year === 2013],
      ['2013 Toyota RAV4 EV', (c) => /^RAV4 EV/.test(c.model) && c.year === 2013],
      ['Honda Clarity Plug-in', (c) => c.make === 'Honda' && /^Clarity Plug-in/.test(c.model)],
      ['Toyota Mirai', (c) => /^Mirai/.test(c.model)],
      ['Hyundai Ioniq 5', (c) => /^Ioniq 5 RWD/.test(c.model)],
      ['Ford Ranger', (c) => c.make === 'Ford' && /^Ranger/.test(c.model) && c.year === 2020],
      ['Dodge Grand Caravan', (c) => /Grand Caravan/.test(c.model) && c.year === 2019],
    ];
    for (const [label, pred] of sold) {
      const car = find(pred);
      expect(car, `${label} is on file`).toBeDefined();
      expect(notRetailedReason(car!), label).toBeUndefined();
      expect(car!.price?.msrp, label).toBeGreaterThan(0);
    }
  });

  it('says why on the car page, and stays out of prices and rivals', () => {
    const fitEv = find((c) => c.make === 'Honda' && /^Fit EV/.test(c.model))!;
    const dashboard = getCarDashboard(fitEv.id)!;
    expect(dashboard.ownership.unvalued).toMatchObject({
      kind: 'not-retailed',
      label: 'Lease or fleet only',
    });
    expect(dashboard.ownership.unvalued?.note).toMatch(/^Never sold to the public: Honda leased/);
    expect(dashboard.car.price).toBeUndefined();

    // A Lordstown Endurance led "cheap electric truck" at $16,500.
    const trucks = searchCars({ query: 'cheap electric truck', limit: 20 });
    expect(trucks.results.map((c) => c.make)).not.toContain('Lordstown');

    // A Leaf's rivals are cars one can buy.
    const leaf = find((c) => c.make === 'Nissan' && c.model === 'Leaf' && c.year === 2013)!;
    const rivals = findSimilarCars(leaf, getAllCars(), 6);
    expect(rivals.filter((c) => notRetailedReason(c))).toEqual([]);
  });
});
