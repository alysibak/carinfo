import type { Car, Provenance } from '../types/car.types.js';

/**
 * The on-disk format of cars-ready.json, the pre-built corpus the API parses
 * on every cold start.
 *
 * Format 2 interns provenance maps. Every car carries one (which source each
 * field came from), yet across 28,000 cars fewer than a hundred distinct maps
 * exist, and writing each out in full made them over a third of the file.
 * Format 2 stores each distinct map once, and every car holds an index into
 * that table. Loading puts `car.provenance` back as a shared, frozen object:
 * frozen because it is shared, so an in-place write (which nothing does today;
 * every update spreads into a new object) fails loudly instead of silently
 * rewriting the provenance of thousands of other cars.
 *
 * Files in the original format (a plain `cars` array) still load.
 */

export interface RuntimeDatabaseMeta {
  lastUpdated: string;
  sources: string[];
  builtAt?: string;
}

type StoredCar = Omit<Car, 'provenance'> & { provenance: number };

export interface RuntimeDatabaseFile extends RuntimeDatabaseMeta {
  ready: true;
  format: 2;
  provenance: Provenance[];
  cars: StoredCar[];
}

interface LegacyDatabaseFile {
  cars: Car[];
  lastUpdated: string;
  sources?: string[];
}

/** Key order carries no meaning, so maps differing only in order share an entry. */
function canonicalKey(provenance: Provenance): string {
  return JSON.stringify(
    Object.entries(provenance).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

export function packRuntimeDatabase(cars: Car[], meta: RuntimeDatabaseMeta): RuntimeDatabaseFile {
  const table: Provenance[] = [];
  const indexByKey = new Map<string, number>();
  const stored = cars.map((car): StoredCar => {
    const provenance = car.provenance ?? {};
    const key = canonicalKey(provenance);
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = table.length;
      table.push(provenance);
      indexByKey.set(key, index);
    }
    return { ...car, provenance: index };
  });
  return { ready: true, format: 2, ...meta, provenance: table, cars: stored };
}

function isFormat2(db: RuntimeDatabaseFile | LegacyDatabaseFile): db is RuntimeDatabaseFile {
  return (db as RuntimeDatabaseFile).format === 2;
}

/**
 * The cars in a parsed cars-ready.json (either format), with provenance
 * restored. Rewrites the parsed records in place rather than copying 28,000
 * objects: the parsed JSON is not used for anything else.
 */
export function unpackRuntimeDatabase(db: RuntimeDatabaseFile | LegacyDatabaseFile): Car[] {
  if (!isFormat2(db)) return db.cars;

  const table = db.provenance.map((entry) => Object.freeze(entry));
  const cars = db.cars as unknown as Car[];
  for (let i = 0; i < db.cars.length; i++) {
    const index = db.cars[i].provenance;
    const provenance = table[index];
    if (provenance === undefined) {
      throw new Error(`cars-ready.json is corrupt: ${db.cars[i].id} has provenance #${index}`);
    }
    cars[i].provenance = provenance;
  }
  return cars;
}
