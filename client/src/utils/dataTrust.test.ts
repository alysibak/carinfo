import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sparseDashboard } from '../test/fixtures';
import { buildProvenanceEntries, PROVENANCE_FIELD_LABELS } from './dataTrust';

describe('data sources panel', () => {
  it('lists forced induction and a derived trim with their sources', () => {
    const dashboard = {
      ...sparseDashboard,
      car: {
        ...sparseDashboard.car,
        variant: 'GT',
        engine: { ...sparseDashboard.car.engine, aspiration: 'turbocharged' as const },
        provenance: { 'engine.aspiration': 'epa' as const, variant: 'estimated' as const },
      },
    };
    const entries = buildProvenanceEntries(dashboard);
    expect(entries.find((e) => e.key === 'engine.aspiration')?.source).toBe('epa');
    expect(entries.find((e) => e.key === 'variant')?.source).toBe('estimated');
  });

  it('has a label for every provenance field the data carries', () => {
    // An unlabelled key is dropped from the panel without a trace; the EPA
    // restoration's "engine.aspiration" was, on every turbocharged listing.
    const file = resolve(__dirname, '../../../server/data/cars.json');
    const { cars } = JSON.parse(readFileSync(file, 'utf8')) as {
      cars: Array<{ provenance?: Record<string, string> }>;
    };
    const keys = new Set<string>(['variant']);
    for (const car of cars) for (const key of Object.keys(car.provenance ?? {})) keys.add(key);
    expect([...keys].filter((key) => !PROVENANCE_FIELD_LABELS[key])).toEqual([]);
  });
});
