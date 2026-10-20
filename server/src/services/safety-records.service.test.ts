import { describe, expect, it } from 'vitest';
import { canadianRecallsFor, complaintRankFor, complaintsFor } from './safety-records.service.js';
import { getCarDashboard, getCarRecords } from './dashboard.service.js';
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

  it('ranks a year among its model’s years by complaints', () => {
    const years = Array.from({ length: 10 }, (_, i) => 2014 + i);
    // The 2017-2018 CR-V's engine oil complaints.
    expect(complaintRankFor('honda|cr-v', 2018, years)).toEqual({ position: 1, of: 10 });
    expect(complaintRankFor('honda|cr-v', 2020, years)!.position).toBeGreaterThan(2);
    // Too few years to rank, and none for a model it cannot match.
    expect(complaintRankFor('honda|cr-v', 2018, [2017, 2018])).toBeUndefined();
    expect(complaintRankFor('nobody|nothing', 2018, years)).toBeUndefined();
  });

  it('gives a car’s records in brief, for the garage', () => {
    const [crv] = searchCars({ query: '2017 honda cr-v', limit: 1 }).results;
    const records = getCarRecords(crv.id)!;
    expect(records.recalls).toBeGreaterThan(0);
    expect(records.complaints).toBeGreaterThan(500);
    expect(records.complaintPart).toBe('ENGINE');
    expect(getCarRecords('no-such-car')).toBeNull();
  });

  it('reaches the car’s page', () => {
    const [camry] = searchCars({ query: '2018 toyota camry', limit: 1 }).results;
    const dashboard = getCarDashboard(camry.id)!;
    expect(dashboard.recalls?.length).toBeGreaterThan(0);
    expect(dashboard.complaints?.complaints).toBeGreaterThan(0);
  });
});
