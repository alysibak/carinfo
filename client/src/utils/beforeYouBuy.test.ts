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

  it('says where thieves rank the model, and what to ask the insurer', () => {
    const theft = {
      rank: 3,
      of: 10,
      model: 'Honda CR-V',
      year: 2024,
      url: 'https://www.equiteassociation.com/top-10-most-stolen-vehicles',
    };
    const items = beforeYouBuy(
      dashboard({ recalls: undefined, complaints: undefined, theft }, { safetyRating: undefined }),
    );
    expect(items).toEqual([
      {
        key: 'theft',
        href: '#theft',
        text: 'The Honda CR-V was the 3rd most stolen vehicle in Canada in 2024: ask your insurer what it would cost to insure and whether it requires an anti-theft device.',
      },
    ]);
  });

  it('names an investigation NHTSA still has open', () => {
    const items = beforeYouBuy(
      dashboard(
        {
          recalls: undefined,
          complaints: undefined,
          investigations: [
            {
              id: 'PE19003',
              kind: 'PE',
              opened: '2019-03-11',
              component: 'ENGINE AND ENGINE COOLING',
              subject: 'OIL DILUTION',
            },
            {
              id: 'PE15001',
              kind: 'PE',
              opened: '2015-01-02',
              closed: '2015-09-01',
              component: 'AIR BAGS',
              subject: 'Inflator rupture',
            },
          ],
        },
        { safetyRating: undefined },
      ),
    );
    expect(items).toEqual([
      {
        key: 'investigation',
        href: '#recalls',
        text: 'NHTSA (U.S.) has had an investigation open since Mar 11, 2019 into the engine and engine cooling: Oil dilution. A recall may follow.',
      },
    ]);
  });

  it('counts the recalls that can cover this version, and names the rest', () => {
    const recall = (number: string, summary: string) => ({
      number,
      date: '2023-01-01',
      system: 'Electrical',
      kind: 'safety' as const,
      summary,
    });
    const [item] = beforeYouBuy(
      dashboard(
        {
          complaints: undefined,
          recalls: [
            recall('2023001', 'Issue: On certain vehicles, the airbag sensor may fail.'),
            recall('2023002', 'Issue: On certain RAV4 Prime models, the caps were not installed.'),
            recall('2023003', 'On certain plug-in hybrid vehicles, the converter could fail.'),
          ],
        },
        {
          safetyRating: undefined,
          engine: { ...sparseDashboard.car.engine, fuelType: 'gasoline' },
        },
      ),
    );
    expect(item.text).toBe(
      '1 recall in Canada for the 2018 Honda CR-V (2 more are for the plug-in hybrid alone): ask for proof the work was done, or check the VIN with the maker or Transport Canada.',
    );
  });
});
