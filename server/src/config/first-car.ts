/**
 * What "first car" means here, for the Browse preset and for searches that
 * say "first car", "teenager" or "student": affordable, easy on gas and not
 * too old, cheapest first. One definition, so the two never disagree.
 */
export const FIRST_CAR = {
  maxPrice: 18000,
  minMpg: 28,
  minYear: 2010,
  // Not hydrogen or natural gas: a Tucson Fuel Cell passed the MPG limit and
  // led a list of first cars, with a handful of stations to fill it at.
  fuelTypes: ['gasoline', 'diesel', 'hybrid', 'plug-in hybrid', 'electric'],
} as const;
