import {
  NHTSA_PHOTO_FILE,
  type NhtsaPhotoFile,
  type NhtsaPhotoVehicle,
} from '../../src/utils/nhtsa-photos.js';
import { fetchJson } from './fetch.js';

/**
 * NHTSA's 5-Star Safety Ratings API, walked a model year at a time: its
 * makes, each make's models, each model's rated variants, and each variant's
 * photo (VehiclePicture: the car NHTSA bought and crashed, photographed
 * beforehand). See build-nhtsa-photos.ts.
 */

const API = 'https://api.nhtsa.gov/SafetyRatings';
const PHOTO_HOST = 'https://static.nhtsa.gov/images/vehicles/';
const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;

interface Results<T> {
  Results?: T[];
}

/** The file name of a VehiclePicture on NHTSA's image host, else undefined. */
export function pictureFile(url: string | undefined): string | undefined {
  if (!url?.startsWith(PHOTO_HOST)) return undefined;
  const file = url.slice(PHOTO_HOST.length);
  return NHTSA_PHOTO_FILE.test(file) ? file : undefined;
}

/** Make names compared as letters and digits only: "MERCEDES-BENZ" is Mercedes-Benz. */
export const makeKey = (make: string) => make.toLowerCase().replace(/[^a-z0-9]/g, '');

async function get<T>(path: string, delays = [1_000, 4_000]): Promise<T[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const body = await fetchJson<Results<T>>(`${API}${path}`, TIMEOUT_MS);
      return Array.isArray(body?.Results) ? body.Results : [];
    } catch (error) {
      if (attempt >= ATTEMPTS) throw error;
      await new Promise((r) => setTimeout(r, delays[attempt - 1] ?? 4_000));
    }
  }
}

/** fn over items, at most `limit` at a time, results in order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export interface YearListing {
  vehicles: NhtsaPhotoVehicle[];
  /** Requests that failed after retries: the year is incomplete. */
  failures: string[];
  /** Rated variants without a photo on NHTSA's image host. */
  withoutPhoto: number;
}

export interface ListYearOptions {
  /** Only these makes (makeKey), the ones the site lists. */
  makes: Set<string>;
  /** Vehicles already fetched, by VehicleId: their photo is not asked for again. */
  known: Map<number, NhtsaPhotoVehicle>;
  concurrency?: number;
  /** Retry delays, for tests. */
  delays?: number[];
}

/** Every rated variant NHTSA lists for a model year, with its photo. */
export async function listYear(year: number, options: ListYearOptions): Promise<YearListing> {
  const { makes, known, concurrency = 4, delays } = options;
  const failures: string[] = [];
  let withoutPhoto = 0;
  const attempt = async <T>(path: string): Promise<T[] | undefined> => {
    try {
      return await get<T>(path, delays);
    } catch (error) {
      failures.push(`${path}: ${(error as Error).message}`);
      return undefined;
    }
  };
  const seg = encodeURIComponent;

  const makeRows = (await attempt<{ Make?: string }>(`/modelyear/${year}`)) ?? [];
  const yearMakes = [...new Set(makeRows.map((r) => r.Make?.trim() ?? ''))].filter(
    (make) => make && makes.has(makeKey(make)),
  );

  const models = (
    await mapLimit(yearMakes, concurrency, async (make) => {
      const rows =
        (await attempt<{ Model?: string }>(`/modelyear/${year}/make/${seg(make)}`)) ?? [];
      return [...new Set(rows.map((r) => r.Model?.trim() ?? ''))]
        .filter(Boolean)
        .map((model) => ({ make, model }));
    })
  ).flat();

  const variants = (
    await mapLimit(models, concurrency, async ({ make, model }) => {
      const rows =
        (await attempt<{ VehicleId?: number; VehicleDescription?: string }>(
          `/modelyear/${year}/make/${seg(make)}/model/${seg(model)}`,
        )) ?? [];
      return rows
        .filter((r) => Number.isInteger(r.VehicleId) && r.VehicleId! > 0)
        .map((r) => ({ make, model, id: r.VehicleId!, description: r.VehicleDescription ?? '' }));
    })
  ).flat();

  const vehicles = await mapLimit(variants, concurrency, async (v) => {
    const cached = known.get(v.id);
    if (cached) return cached;
    const detail = (await attempt<{ VehiclePicture?: string }>(`/VehicleId/${v.id}`))?.[0];
    if (!detail) return undefined;
    const picture = pictureFile(detail.VehiclePicture);
    if (!picture) {
      withoutPhoto++;
      return undefined;
    }
    return {
      id: v.id,
      year,
      make: v.make,
      model: v.model,
      description: v.description.trim(),
      picture,
    } satisfies NhtsaPhotoVehicle;
  });

  return {
    vehicles: vehicles.filter((v): v is NhtsaPhotoVehicle => Boolean(v)),
    failures,
    withoutPhoto,
  };
}

/** The data file, a vehicle to a line so a refresh's diff reads by vehicle. */
export function serializePhotoFile(file: NhtsaPhotoFile): string {
  const vehicles = [...file.vehicles].sort(
    (a, b) =>
      a.year - b.year ||
      a.make.localeCompare(b.make) ||
      a.model.localeCompare(b.model) ||
      a.id - b.id,
  );
  const years = Object.fromEntries(
    Object.entries(file.years).sort(([a], [b]) => Number(a) - Number(b)),
  );
  return [
    '{',
    `  "source": ${JSON.stringify(file.source)},`,
    `  "years": ${JSON.stringify(years)},`,
    '  "vehicles": [',
    vehicles.map((v) => `    ${JSON.stringify(v)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
}
