/**
 * The model years the vehicle data covers. A test pins these to the loaded
 * corpus, so a data refresh that adds a year fails until they are bumped, and
 * the "newest year" chip and example searches cannot quietly go stale.
 */
export const FIRST_MODEL_YEAR = 1995;
export const LATEST_MODEL_YEAR = 2026;
