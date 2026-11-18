import { describe, expect, it } from 'vitest';
import { REGIONAL_ASSUMPTIONS } from './regional-assumptions';
import { REGION_NAMES } from './regions';

describe('REGION_NAMES', () => {
  it('names every region exactly as its figures do', () => {
    expect(REGION_NAMES).toEqual(
      Object.fromEntries(
        Object.entries(REGIONAL_ASSUMPTIONS).map(([id, region]) => [id, region.label]),
      ),
    );
  });
});
