import { describe, expect, it } from 'vitest';
import { UNAVAILABLE_LABEL } from './dataValue';
import { buildGlanceMetrics } from './glanceMetrics';
import { sparseDashboard } from '../test/fixtures';

describe('glanceMetrics omit-when-empty', () => {
  it('never surfaces safety when NHTSA rating is absent', () => {
    const { cells } = buildGlanceMetrics(sparseDashboard);
    expect(cells.some((c) => c.id === 'safety')).toBe(false);
  });

  it('never surfaces horsepower when not on file', () => {
    const { cells } = buildGlanceMetrics(sparseDashboard);
    expect(cells.some((c) => c.id === 'power')).toBe(false);
  });

  it('never surfaces estimated value when market band is missing', () => {
    const { cells } = buildGlanceMetrics(sparseDashboard);
    expect(cells.some((c) => c.id === 'value')).toBe(false);
  });

  it('does not emit unavailable placeholders or Not on file copy', () => {
    const { cells, note } = buildGlanceMetrics(sparseDashboard);
    for (const cell of cells) {
      expect(cell.unavailable).not.toBe(true);
      expect(cell.value).not.toBe(UNAVAILABLE_LABEL);
      expect(cell.value.toLowerCase()).not.toContain('not on file');
    }
    expect(note).toBeNull();
    expect(cells.length).toBeLessThanOrEqual(4);
    expect(cells.length).toBeGreaterThan(0);
  });
});
