import { describe, expect, it } from 'vitest';
import { formatCarFuelBadge, formatCarFuelLabel } from './fuelDisplay';

describe('mild hybrids', () => {
  const car = (fuelType: 'gasoline' | 'hybrid', mildHybrid?: boolean) => ({
    engine: { fuelType, ...(mildHybrid ? { mildHybrid } : {}) },
  });

  it('are named with their fuel', () => {
    // EPA files a 48 V mild hybrid as a "Hybrid"; it is listed by its fuel.
    expect(formatCarFuelLabel(car('gasoline', true))).toBe('Gasoline, mild hybrid');
    expect(formatCarFuelBadge(car('gasoline', true))).toBe('gasoline mild hybrid');
  });

  it('leave other cars as they were', () => {
    expect(formatCarFuelLabel(car('gasoline'))).toBe('Gasoline');
    expect(formatCarFuelBadge(car('hybrid'))).toBe('hybrid');
  });
});
