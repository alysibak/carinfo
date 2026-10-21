import { describe, expect, it } from 'vitest';
import type { CarDashboard } from '../types/car.types';
import { sparseDashboard } from '../test/fixtures';
import { checklistSections } from './checklist';

const dashboard = (over: Partial<CarDashboard>, car: Partial<CarDashboard['car']> = {}) =>
  ({
    ...sparseDashboard,
    car: { ...sparseDashboard.car, ...car },
    modelPage: { label: 'Toyota Corolla', path: '/models/toyota/corolla' },
    ...over,
  }) as CarDashboard;

describe('checklistSections', () => {
  it('always has the VIN to check and the facts to hold the ad to', () => {
    const sections = checklistSections(dashboard({}));
    expect(sections.map((s) => s.id)).toEqual(['vin', 'facts']);
    expect(sections[1].items.map((i) => i.text)).toEqual([
      'Fuel use: 7.1 L/100 km combined',
      'Drive: FWD',
      'Gearbox: 8-Speed Automatic',
    ]);
  });

  it('lists the recalls, complaints, open investigations, safety and theft, each to tick', () => {
    const sections = checklistSections(
      dashboard(
        {
          recalls: [
            {
              number: '2021123',
              date: '2021-03-04',
              system: 'BRAKES',
              kind: 'safety',
              summary: 'Issue: The pump may fail. Corrective Actions: Dealers will replace it.',
            },
          ],
          complaints: {
            complaints: 120,
            crashes: 0,
            fires: 0,
            injuries: 0,
            deaths: 0,
            parts: [['ENGINE', 40]],
          },
          investigations: [
            {
              id: 'PE21001',
              kind: 'PE',
              opened: '2021-01-05',
              component: 'ENGINE',
              subject: 'STALLING',
            },
            {
              id: 'PE18001',
              kind: 'PE',
              opened: '2018-01-05',
              closed: '2019-01-05',
              component: 'AIR BAGS',
              subject: 'Inflator',
            },
          ],
          theft: {
            rank: 5,
            of: 10,
            model: 'Toyota Corolla',
            year: 2024,
            url: 'https://www.equiteassociation.com/top-10-most-stolen-vehicles',
          },
          recordDates: { recalls: '2026-10-20' },
        },
        {
          safetyRating: { overall: 5, frontal: 4 },
          safetyTech: { fcw: 'optional', ldw: 'standard' },
        },
      ),
    );
    expect(sections.map((s) => s.id)).toEqual([
      'vin',
      'recalls',
      'complaints',
      'investigations',
      'safety',
      'theft',
      'facts',
    ]);
    const byId = Object.fromEntries(sections.map((s) => [s.id, s]));
    expect(byId.recalls.items).toEqual([
      { text: 'Brakes: The pump may fail.', detail: 'Recall 2021123 · Mar 4, 2021', tick: true },
    ]);
    expect(byId.recalls.source).toBe(
      'Transport Canada, Motor Vehicle Safety Recalls Database, records as of Oct 20, 2026',
    );
    expect(byId.complaints.items[0]).toEqual({
      text: 'Engine',
      detail: '40 complaints',
      tick: true,
    });
    // Only the open one: a closed investigation has nothing left to ask.
    expect(byId.investigations.items).toEqual([
      {
        text: 'Engine: Stalling',
        detail: 'Preliminary evaluation PE21001 · opened Jan 5, 2021',
        tick: true,
      },
    ]);
    expect(byId.safety.intro).toMatch(/optional: check this car has it/);
    expect(byId.safety.items.map((i) => [i.text, !!i.tick])).toEqual([
      ['Overall: 5/5', false],
      ['Frontal crash: 4/5', false],
      ['Forward collision warning: optional', true],
      ['Lane departure warning: standard', false],
    ]);
    expect(byId.theft.items[0].text).toBe(
      'The Toyota Corolla was the 5th most stolen vehicle in Canada in 2024, by Équité Association’s count.',
    );
  });

  it('says a matched model year has no recalls, rather than leaving it out', () => {
    const [, recalls] = checklistSections(dashboard({ recalls: [] }));
    expect(recalls.intro).toBe('Transport Canada lists no recalls for the 2020 Toyota Corolla.');
    expect(recalls.items).toEqual([]);
  });
});
