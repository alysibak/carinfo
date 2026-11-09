import { describe, expect, it } from 'vitest';
import { heldBackFor, pumpPricesShape, SITE_FILES } from './check-site-data';

const shape = (stamp: string | null, counts: Record<string, number>) => ({ stamp, counts });

describe('checking the weekly data before it goes on main', () => {
  it('lets through a newer file with as many records or more', () => {
    expect(
      heldBackFor(shape('2026-10-20', { recalls: 5822 }), shape('2026-11-03', { recalls: 5847 })),
    ).toBeNull();
  });

  it('allows a few records to go, as when lines are renamed', () => {
    expect(
      heldBackFor(shape('2026-10-20', { byLine: 7975 }), shape('2026-11-03', { byLine: 7900 })),
    ).toBeNull();
  });

  it('holds back a file that lost many records, as from a download cut short', () => {
    expect(
      heldBackFor(shape('2026-10-20', { tests: 12749 }), shape('2026-11-03', { tests: 9000 })),
    ).toBe('tests fell from 12749 to 9000');
  });

  it('holds back a file older than the one there, or with no date where the old one has one', () => {
    expect(heldBackFor(shape('2026-11-03', {}), shape('2026-10-20', {}))).toMatch(/built before/);
    expect(heldBackFor(shape('2026-11-03', {}), shape(null, {}))).toMatch(/nothing of when/);
    // A file that never carries a date is judged on its counts alone.
    expect(heldBackFor(shape(null, { entries: 100 }), shape(null, { entries: 101 }))).toBeNull();
  });

  it('reads the pump prices file the build script writes', () => {
    const text = `export const PUMP_PRICES = {\n  from: '2025-10',\n  through: '2026-09',\n  cities: {\n    A: {\n      latest: {\n        regular: 1.6,\n      },\n    },\n    B: {\n      latest: {\n        regular: 1.7,\n      },\n    },\n  },\n};\n`;
    expect(pumpPricesShape(text)).toEqual({ stamp: '2026-09', counts: { cities: 2 } });
    expect(() => pumpPricesShape('export const OTHER = {}')).toThrow();
  });

  it("reads each of the site's files as the repository has them", async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const { path, shape: read } of SITE_FILES) {
      const found = read(readFileSync(join(__dirname, '../..', path), 'utf8'));
      if (!/epa-enrichment/.test(path)) expect(found.stamp, path).toBeTruthy();
      for (const count of Object.values(found.counts)) expect(count, path).toBeGreaterThan(0);
    }
  });
});
