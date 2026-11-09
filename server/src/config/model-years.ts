/**
 * The model years the vehicle data covers. scripts/update-model-years.ts
 * writes the three constants from the data (the EPA refresh runs it), and a
 * test holds them to the loaded corpus, so the "newest year" chip and the
 * example searches cannot quietly go stale.
 */
export const FIRST_MODEL_YEAR = 1995;

/**
 * Newest model year on file. EPA certifies next year's models from mid-year
 * on, so this year is often partial: a few dozen cars, not a lineup.
 */
export const LATEST_MODEL_YEAR = 2027;

/**
 * Newest model year with a full lineup: what example searches ("2026 Camry")
 * and the newest-year chip use, so they never come up empty.
 */
export const LATEST_FULL_MODEL_YEAR = 2026;

/** A model year counts as full once EPA lists this many of its cars. */
export const FULL_YEAR_MIN_LISTINGS = 1000;

/** The newest model year among these counts of cars by year, or null with none. */
export function latestModelYearOf(carsByYear: ReadonlyMap<number, number>): number | null {
  let latest: number | null = null;
  for (const [year, count] of carsByYear) {
    if (count > 0 && (latest === null || year > latest)) latest = year;
  }
  return latest;
}

/** The newest model year with a full lineup (see FULL_YEAR_MIN_LISTINGS), or null with none. */
export function latestFullModelYearOf(carsByYear: ReadonlyMap<number, number>): number | null {
  let latest: number | null = null;
  for (const [year, count] of carsByYear) {
    if (count >= FULL_YEAR_MIN_LISTINGS && (latest === null || year > latest)) latest = year;
  }
  return latest;
}
