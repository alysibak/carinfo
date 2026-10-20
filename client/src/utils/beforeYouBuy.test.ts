import { describe, expect, it } from 'vitest';
import type { CarDashboard } from '../types/car.types';
import { sparseDashboard } from '../test/fixtures';
import { beforeYouBuy } from './beforeYouBuy';

const dashboard = (over: Partial<CarDashboard>, car: Partial<CarDashboard['car']> = {}) =>
  ({
    ...sparseDashboard,
    car: { ...sparseDashboard.car, make: 'Honda', model: 'CR-V', year: 2018, ...car },
    modelPage: { label: 'Honda CR-V', path: '/models/honda/cr-v' },
    ...over,
  }) as CarDashboard;

describe('beforeYouBuy', () => {
  it('lists the recalls to verify, what owners complained of and the crash rating', () => {
    const items = beforeYouBuy(
      dashboard(
        {
          recalls: [
            {
              number: '2018123',
              date: '2018-05-01',
              system: 'Engine',
              kind: 'safety',
              summary: 'Issue: oil.',
            },
          ],
          complaints: {
            complaints: 2158,
            crashes: 3,
            fires: 1,
            injuries: 2,
            deaths: 0,
            parts: [
              ['ENGINE', 900],
              ['ELECTRICAL SYSTEM', 300],
              ['AIR BAGS', 200],
            ],
          },
          complaintRank: { position: 1, of: 31 },
        },
        { safetyRating: { overall: 5, nhtsaIds: [1] }, safetyTech: { fcw: 'optional' } },
      ),
    );
    expect(items.map((i) => i.text)).toEqual([
      '1 recall in Canada for the 2018 Honda CR-V: ask for proof the work was done, or check the VIN with the maker or Transport Canada.',
      'Owners complained to NHTSA most about the engine, electrical system and air bags (2,158 complaints, the most of any Honda CR-V year on file): worth a look on a test drive.',
      'NHTSA crash rating 5/5 overall, with forward collision warning optional.',
    ]);
    expect(items.map((i) => i.href)).toEqual(['#recalls', '#recalls', '#safety']);
  });

  it('says only what is on file', () => {
    // No matched records and no rating: nothing to say.
    expect(
      beforeYouBuy(
        dashboard({ recalls: undefined, complaints: undefined }, { safetyRating: undefined }),
      ),
    ).toEqual([]);
    // A matched model with no recalls says so.
    expect(beforeYouBuy(dashboard({ recalls: [] }, { safetyRating: undefined }))[0].text).toBe(
      'No recalls in Canada listed for the 2018 Honda CR-V.',
    );
  });
});
