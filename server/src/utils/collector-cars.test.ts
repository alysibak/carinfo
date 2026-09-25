import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars } from '../services/car.service.js';
import { getCarDashboard } from '../services/dashboard.service.js';
import { isCollectorCar } from './collector-cars.js';

const find = (pred: (c: Car) => boolean) => getAllCars().find(pred);

describe('collector cars', () => {
  it('recognises the established collector market', () => {
    const collectors: Array<[string, (c: Car) => boolean]> = [
      ['1995 Toyota Supra', (c) => c.make === 'Toyota' && c.model === 'Supra' && c.year === 1995],
      ['1995 Acura NSX', (c) => c.make === 'Acura' && /^NSX/.test(c.model) && c.year === 1995],
      ['2005 Ford GT', (c) => c.make === 'Ford' && /^GT\b/.test(c.model) && c.year === 2005],
      ['1996 Porsche 911', (c) => c.make === 'Porsche' && /^911/.test(c.model) && c.year === 1996],
      ['2000 Honda S2000', (c) => c.make === 'Honda' && /^S2000/.test(c.model) && c.year === 2000],
      ['1995 Ferrari F50', (c) => c.make === 'Ferrari' && /F50/.test(c.model)],
    ];
    for (const [label, pred] of collectors) {
      const car = find(pred);
      expect(car, `${label} is on file`).toBeDefined();
      expect(isCollectorCar(car!), label).toBe(true);
    }
  });

  it('leaves ordinary and recent cars to the depreciation model', () => {
    const ordinary: Array<[string, (c: Car) => boolean]> = [
      ['1995 Honda Civic', (c) => c.make === 'Honda' && c.model === 'Civic' && c.year === 1995],
      ['2020 Porsche 911', (c) => c.make === 'Porsche' && /^911/.test(c.model) && c.year === 2020],
      [
        '2020 Toyota GR Supra',
        (c) => c.make === 'Toyota' && /GR Supra/.test(c.model) && c.year === 2020,
      ],
      [
        '2013 Ford Mustang (incl. GT500)',
        (c) => c.make === 'Ford' && /Mustang/.test(c.model) && c.year === 2013,
      ],
      ['2016 Ferrari 488', (c) => c.make === 'Ferrari' && c.year === 2016],
    ];
    for (const [label, pred] of ordinary) {
      const car = find(pred);
      expect(car, `${label} is on file`).toBeDefined();
      expect(isCollectorCar(car!), label).toBe(false);
    }
  });

  it('carries no price, and the dossier says why', () => {
    const supra = find((c) => c.make === 'Toyota' && c.model === 'Supra' && c.year === 1995)!;
    // It used to list at $2,300.
    expect(supra.price).toBeUndefined();
    const dashboard = getCarDashboard(supra.id)!;
    expect(dashboard.ownership.collector?.note).toMatch(/collector car/i);
    expect(dashboard.car.price).toBeUndefined();

    const civic = find((c) => c.make === 'Honda' && c.model === 'Civic' && c.year === 1995)!;
    expect(civic.price?.msrp).toBeGreaterThan(0);
    expect(getCarDashboard(civic.id)!.ownership.collector).toBeUndefined();
  });
});
