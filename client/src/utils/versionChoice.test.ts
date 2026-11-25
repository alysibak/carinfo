import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { countWith, matchVersions, versionChoices } from './versionChoice';

function car(id: string, model: string, extra: Partial<CarSpecs> = {}): CarSpecs {
  return {
    id,
    make: 'Ford',
    model,
    year: 2024,
    provenance: {},
    engine: { fuelType: 'gasoline', displacement: 3.5, cylinders: 6, aspiration: 'turbocharged' },
    fuelEconomy: { city: 18, highway: 24, combined: 20 },
    transmission: { type: 'automatic', speeds: 10 },
    driveType: '4WD',
    bodyStyle: 'truck',
    ...extra,
  } as CarSpecs;
}

const f150 = [
  car('rwd-27', 'F150 Pickup 2WD', {
    driveType: 'RWD',
    engine: { fuelType: 'gasoline', displacement: 2.7, cylinders: 6, aspiration: 'turbocharged' },
  }),
  car('4wd-35', 'F150 Pickup 4WD'),
  car('hev', 'F150 Pickup 4WD HEV', {
    engine: { fuelType: 'hybrid', displacement: 3.5, cylinders: 6, aspiration: 'turbocharged' },
  }),
  car('tremor', 'F150 Pickup 4WD Tremor'),
  car('raptor', 'F150 RAPTOR 4WD'),
];

describe('version choices', () => {
  it('offers only what tells the year’s versions apart', () => {
    const choices = versionChoices(f150);
    expect(choices.map((c) => c.id)).toEqual(['power', 'drive', 'engine', 'edition']);
    expect(choices.find((c) => c.id === 'drive')!.options).toEqual(['RWD', '4WD']);
    // The name's own words, less what the other choices say (drive, hybrid,
    // body), and EPA's capitals as the badge reads.
    expect(choices.find((c) => c.id === 'edition')!.options).toEqual([
      'Standard',
      'Raptor',
      'Tremor',
    ]);
  });

  it('narrows to the versions with every pick, and counts what an option would leave', () => {
    expect(matchVersions(f150, { power: 'Hybrid' }).map((c) => c.id)).toEqual(['hev']);
    expect(matchVersions(f150, { drive: '4WD', edition: 'Standard' }).map((c) => c.id)).toEqual([
      '4wd-35',
      'hev',
    ]);
    expect(countWith(f150, { drive: 'RWD' }, 'power', 'Hybrid')).toBe(0);
    expect(countWith(f150, {}, 'drive', '4WD')).toBe(4);
    expect(matchVersions(f150, {})).toHaveLength(5);
  });

  it('reads doors and a manual from what the names and gearboxes say', () => {
    const wrangler = [
      car('2dr', 'Wrangler 2dr', { transmission: { type: 'manual', speeds: 6 } }),
      car('4dr', 'Wrangler 4dr'),
    ];
    const ids = versionChoices(wrangler).map((c) => c.id);
    expect(ids).toEqual(['doors', 'gearbox']);
    expect(matchVersions(wrangler, { doors: '2' }).map((c) => c.id)).toEqual(['2dr']);
    expect(matchVersions(wrangler, { gearbox: 'Automatic' }).map((c) => c.id)).toEqual(['4dr']);
  });
});
