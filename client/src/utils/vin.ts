/**
 * VIN parsing helpers for camera scans.
 *
 * VINs are 17 characters from an alphabet that excludes I, O and Q.
 * Door-jamb barcodes (Code 39) sometimes wrap the VIN in `*` guards or
 * prefix an extra "I" import character, and registration PDF417 blobs
 * embed the VIN inside longer payloads — so extraction has to tolerate
 * all three shapes.
 */

const VIN_RUN = /[A-HJ-NPR-Z0-9]{17,}/g;

export function isLikelyVin(text: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(text);
}

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** North-American check digit (position 9). Not all world VINs comply. */
export function vinCheckDigitValid(vin: string): boolean {
  if (!isLikelyVin(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    const value = ch >= '0' && ch <= '9' ? Number(ch) : TRANSLITERATION[ch];
    if (value === undefined) return false;
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  return vin[8] === expected;
}

/**
 * Pull a plausible VIN out of raw barcode text. Returns null when no
 * credible 17-character candidate is present.
 *
 * The "I" import prefix needs no special case: I is outside the VIN
 * alphabet, so a read like "I1HGCM..." splits into a clean 17-char run.
 */
export function extractVinFromScan(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[*\s]/g, '');
  if (!cleaned) return null;

  const exactReads: string[] = [];
  const windowed: string[] = [];

  for (const run of cleaned.match(VIN_RUN) ?? []) {
    if (run.length === 17) {
      exactReads.push(run);
      continue;
    }
    // Longer payload (e.g. PDF417): only trust check-digit-valid slices.
    for (let start = 0; start + 17 <= run.length; start++) {
      const slice = run.slice(start, start + 17);
      if (vinCheckDigitValid(slice)) windowed.push(slice);
    }
  }

  // Prefer any candidate that passes the check digit; fall back to an
  // exact-length read (some non-North-American VINs don't comply).
  return (
    exactReads.find(vinCheckDigitValid) ??
    windowed[0] ??
    exactReads[0] ??
    null
  );
}
