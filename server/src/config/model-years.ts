/**
 * The model years the vehicle data covers. A test pins these to the loaded
 * corpus, so a data refresh that adds a year fails until they are bumped, and
 * the "newest year" chip and example searches cannot quietly go stale.
 */
export const FIRST_MODEL_YEAR = 1995;

/**
 * Newest model year on file. EPA certifies next year's models from mid-year
 * on, so this year is often partial: a few dozen cars, not a lineup.
 */
export const LATEST_MODEL_YEAR = 2027;

/**
 * Newest model year with a full lineup: what example searches ("2026 Camry")
 * and the newest-year chip use, so they never come up empty. A test fails
 * once LATEST_MODEL_YEAR fills in, as the cue to bump this.
 */
export const LATEST_FULL_MODEL_YEAR = 2026;
