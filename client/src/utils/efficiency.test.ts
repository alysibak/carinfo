import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { efficiencyOf, rangeKm } from './efficiency';

function car(fuelType: string, combined: number, extra: Partial<CarSpecs> = {}) {
  return {
    engine: { fuelType },
    fuelEconomy: { city: combined + 3, highway: combined - 3, combined },
    ...extra,
  } as unknown as CarSpecs;
}

describe('efficiencyOf', () => {
  it('leads with litres per 100 km and keeps the EPA figure beside it', () => {
    expect(efficiencyOf(car('gasoline', 31))).toMatchObject({
      text: '7.6 L/100 km',
      epa: '31 mpg',
      label: 'Fuel use',
    });
  });

  it('reads the city and highway ratings too', () => {
    expect(efficiencyOf(car('gasoline', 31), 'city')?.text).toBe('6.9 L/100 km');
  });

  it('gives an EV kWh per 100 km, from EPA’s measured figure when on file', () => {
    expect(efficiencyOf(car('electric', 120))?.text).toBe('17.5 kWh/100 km');
    const measured = car('electric', 120, { epa: { kWhPer100Mi: 30 } } as Partial<CarSpecs>);
    expect(efficiencyOf(measured)).toMatchObject({ text: '18.6 kWh/100 km', epa: '120 MPGe' });
  });

  it('names a plug-in hybrid’s figure as its gas mode', () => {
    expect(efficiencyOf(car('plug-in hybrid', 40))?.label).toBe('Gas-mode fuel use');
  });

  it('gives hydrogen in kilograms per 100 km', () => {
    expect(efficiencyOf(car('hydrogen', 72))?.text).toBe('0.86 kg/100 km');
  });

  it('returns nothing when EPA has no rating', () => {
    expect(efficiencyOf(car('gasoline', 0))).toBeNull();
  });
});

describe('rangeKm', () => {
  it('converts EPA miles', () => {
    expect(rangeKm(330)).toBe(531);
  });
});
