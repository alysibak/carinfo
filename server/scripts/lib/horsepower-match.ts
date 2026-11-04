/**
 * Aspiration-aware helpers for matching EPA Test Car List rated horsepower
 * to fueleconomy.gov cars. EPA's test-car rows rarely flag turbo/NA explicitly,
 * so we infer from the carline text when we can, and when one carline still
 * carries both a NA and a turbo reading we pick by the car's own aspiration.
 */

export type Induction = 'forced' | 'na' | 'unknown';

/** Forced induction named in an EPA carline ("Legacy GT Turbo", "Mustang Shelby GT500"). */
export function inductionFromCarline(model: string): Induction {
  if (/\b(turbo|supercharg|twin[\s-]?charg|gt500|hellcat|trackhawk|type[\s-]?r)\b/i.test(model)) {
    return 'forced';
  }
  return 'unknown';
}

/** A site car's aspiration flag: set → forced; unset (and not electric) → NA. */
export function inductionFromCar(aspiration: string | undefined | null): Induction {
  return aspiration ? 'forced' : 'na';
}

/** Whether a test-car row's induction can stand for this car's. Unknown always can. */
export function inductionCompatible(car: Induction, variant: Induction): boolean {
  if (variant === 'unknown' || car === 'unknown') return true;
  return car === variant;
}

/**
 * Pick one horsepower from a set of distinct readings for the same engine.
 * When NA and turbo share a carline the spread is wide; take the upper cluster
 * for forced cars and the lower for NA so a Legacy GT does not keep the 2.5i's
 * 168 hp. A tight cluster (one engine) still uses the median.
 */
export function pickHorsepowerForInduction(values: number[], induction: Induction): number | null {
  if (values.length === 0) return null;
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  if (distinct.length === 1) return distinct[0];

  const lo = distinct[0];
  const hi = distinct[distinct.length - 1];
  const mid = distinct[Math.floor(distinct.length / 2)];
  const spread = hi - lo;
  const loose = spread > Math.max(15, 0.08 * mid);

  if (!loose || induction === 'unknown') {
    const m = distinct.length >> 1;
    return distinct.length % 2 ? distinct[m] : Math.round((distinct[m - 1] + distinct[m]) / 2);
  }

  // Split midway between the extremes so a two-value NA/turbo pair (168 vs 250)
  // does not put both sides on the same side of the median reading.
  const cut = (lo + hi) / 2;
  if (induction === 'forced') {
    const upper = distinct.filter((v) => v >= cut);
    return upper[Math.floor(upper.length / 2)] ?? hi;
  }

  const lower = distinct.filter((v) => v <= cut);
  return lower[Math.floor(lower.length / 2)] ?? lo;
}
