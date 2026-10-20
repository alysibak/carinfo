import { describe, expect, it } from 'vitest';
import { canadianRecallsFor, complaintsFor } from './safety-records.service.js';
import { getCarDashboard } from './dashboard.service.js';
import { searchCars } from './car.service.js';

describe('safety records', () => {
  it('gives Transport Canada’s recalls for a model year, newest first, with their numbers', () => {
    const recalls = canadianRecallsFor('toyota|camry', 2018)!;
    expect(recalls.length).toBeGreaterThan(0);
    expect(recalls.every((r) => /^\d{7}$/.test(r.number) && r.summary.length > 20)).toBe(true);
    const dates = recalls.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('counts NHTSA complaints, and says nothing for a model it cannot match', () => {
    expect(complaintsFor('honda|cr-v', 2017)!.complaints).toBeGreaterThan(500);
    expect(canadianRecallsFor('nobody|nothing', 2018)).toBeUndefined();
    expect(complaintsFor('nobody|nothing', 2018)).toBeUndefined();
  });

  it('reaches the car’s page', () => {
    const [camry] = searchCars({ query: '2018 toyota camry', limit: 1 }).results;
    const dashboard = getCarDashboard(camry.id)!;
    expect(dashboard.recalls?.length).toBeGreaterThan(0);
    expect(dashboard.complaints?.complaints).toBeGreaterThan(0);
  });
});
