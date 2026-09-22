import type { Car } from '../types/car.types.js';

/**
 * Vehicle IDs are slugs of make/model/year/trim. EPA model strings that differ
 * only in whitespace or case ("Van 15/25 2WD" vs "Van 15/25  2WD", "4matic" vs
 * "4Matic") slugify to the same ID, and the trim slug does not encode the
 * engine — so two different powertrains can share an ID too.
 *
 * A shared ID is a real bug, not a cosmetic one. The ID index is a Map built by
 * iterating the corpus, so the last row silently wins: search still lists both
 * rows, but clicking the earlier one opens the later one's detail page. In the
 * shipped dataset that meant a 2005 Chevrolet van with a 5.3 L V8 showed the
 * spec sheet of the 4.3 L V6 variant.
 *
 * Resolution, per colliding group:
 *   - rows whose specs are identical are EPA double-listings — keep one;
 *   - rows that genuinely differ keep their data, and all but one get an
 *     `-epa<epaId>` suffix.
 *
 * The bare ID always stays on the *last* row of the group, because that is
 * what the ID has resolved to until now. Existing links, bookmarks and saved
 * garages therefore keep pointing at the same vehicle; only rows that were
 * previously unreachable get new IDs, and nothing could have linked to those.
 */

export interface UniqueIdReport {
  /** Spec-identical duplicates that were dropped. */
  mergedDuplicates: string[];
  /** Genuinely different vehicles that received a disambiguating suffix. */
  renamed: Array<{ from: string; to: string }>;
}

const collapse = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Everything a shopper would see differ between two rows. */
function specFingerprint(car: Car): string {
  return [
    collapse(car.make),
    collapse(car.model),
    car.year,
    collapse(car.trim),
    car.bodyStyle,
    car.driveType,
    car.engine?.fuelType,
    car.engine?.displacement ?? '',
    car.engine?.cylinders ?? '',
    car.transmission?.type ?? '',
    car.transmission?.speeds ?? '',
    car.fuelEconomy?.city ?? '',
    car.fuelEconomy?.highway ?? '',
    car.fuelEconomy?.combined ?? '',
  ].join('|');
}

function disambiguatedId(car: Car, taken: Set<string>): string {
  const base = car.epaId != null ? `${car.id}-epa${car.epaId}` : `${car.id}-v`;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

/**
 * Return a corpus in which every ID is unique. Order is preserved; the input is
 * not mutated (renamed rows are shallow copies).
 */
export function ensureUniqueIds(cars: Car[]): { cars: Car[]; report: UniqueIdReport } {
  const report: UniqueIdReport = { mergedDuplicates: [], renamed: [] };

  const groups = new Map<string, number[]>();
  cars.forEach((car, index) => {
    const bucket = groups.get(car.id);
    if (bucket) bucket.push(index);
    else groups.set(car.id, [index]);
  });

  const drop = new Set<number>();
  const rename = new Map<number, string>();
  const taken = new Set(cars.map((c) => c.id));

  for (const [id, indexes] of groups) {
    if (indexes.length < 2) continue;

    // Walk from the last row backwards: it keeps the bare ID.
    const keeperIndex = indexes[indexes.length - 1];
    const seenFingerprints = new Set([specFingerprint(cars[keeperIndex])]);

    for (let i = indexes.length - 2; i >= 0; i -= 1) {
      const index = indexes[i];
      const fingerprint = specFingerprint(cars[index]);
      if (seenFingerprints.has(fingerprint)) {
        drop.add(index);
        report.mergedDuplicates.push(id);
        continue;
      }
      seenFingerprints.add(fingerprint);
      const next = disambiguatedId(cars[index], taken);
      taken.add(next);
      rename.set(index, next);
      report.renamed.push({ from: id, to: next });
    }
  }

  if (drop.size === 0 && rename.size === 0) return { cars, report };

  const out: Car[] = [];
  cars.forEach((car, index) => {
    if (drop.has(index)) return;
    const renamedTo = rename.get(index);
    out.push(renamedTo ? { ...car, id: renamedTo } : car);
  });
  return { cars: out, report };
}
