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
