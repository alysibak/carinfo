import type { RegionId } from './regional-assumptions';

/**
 * Each region's full name, apart from its figures: the client names the
 * visitor's region on every page ("fuel in British Columbia"), and the
 * figures behind it (regional-assumptions.ts) stay out of its first load.
 * regions.test.ts keeps the two in step.
 */
export const REGION_NAMES: Record<RegionId, string> = {
  ontario: 'Ontario',
  'british-columbia': 'British Columbia',
  alberta: 'Alberta',
  quebec: 'Quebec',
  manitoba: 'Manitoba',
  saskatchewan: 'Saskatchewan',
  'nova-scotia': 'Nova Scotia',
  'new-brunswick': 'New Brunswick',
  'prince-edward-island': 'Prince Edward Island',
  'newfoundland-and-labrador': 'Newfoundland and Labrador',
};

/** A yearly distance worth taking as someone's own, km. */
export const OWN_KM_RANGE = { min: 1000, max: 100_000 } as const;

/** 1,000 to 100,000 km: what the client may set and the server takes. */
export function plausibleAnnualKm(km: unknown): km is number {
  return (
    typeof km === 'number' &&
    Number.isFinite(km) &&
    km >= OWN_KM_RANGE.min &&
    km <= OWN_KM_RANGE.max
  );
}
