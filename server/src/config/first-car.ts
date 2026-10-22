/**
 * What "first car" means here, for the Browse preset and for searches that
 * say "first car", "teenager" or "student", on the records alone: 2015 or
 * newer, four or more NHTSA crash-test stars, not small and light, not too
 * powerful for a new driver, and easy on gas. One definition, so the two never disagree.
 *
 * It used to be "under $18,000" of the site's own estimated value: a guess
 * at a price, where the records say what matters for a new driver.
 */
export const FIRST_CAR = {
  minYear: 2015,
  /** NHTSA overall stars: a car NHTSA never rated is left out, not judged. */
  minStars: 4,
  /** New drivers do better without much power; 250 hp takes in most family cars. */
  maxHp: 250,
  /** 28 US mpg is 8.4 L/100 km. */
  minMpg: 28,
  /**
   * IIHS and Consumer Reports leave anything under 2,750 lb (1,247.4 kg) off
   * their lists of cars for teens: small, light cars protect less in a crash
   * with another vehicle. Transport Canada's curb weight, every version.
   */
  minWeightKg: 1248,
  // Not hydrogen or natural gas: a Tucson Fuel Cell passed the MPG limit and
  // led a list of first cars, with a handful of stations to fill it at.
  fuelTypes: ['gasoline', 'diesel', 'hybrid', 'plug-in hybrid', 'electric'],
} as const;
