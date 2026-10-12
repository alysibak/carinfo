import {
  NHTSA_PHOTO_FILE,
  type NhtsaPhotoFile,
  type NhtsaPhotoVehicle,
} from '../../src/utils/nhtsa-photos.js';
import { fetchJson, HttpError } from './fetch.js';

/**
 * NHTSA's 5-Star Safety Ratings API, walked a model year at a time: its
 * makes, each make's models, each model's rated variants, and each variant's
 * photo (VehiclePicture: the car NHTSA bought and crashed, photographed
 * beforehand). See build-nhtsa-photos.ts.
 */

const API = 'https://api.nhtsa.gov/SafetyRatings';
const PHOTO_HOST = 'https://static.nhtsa.gov/images/vehicles/';
const TIMEOUT_MS = 20_000;

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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Pacing {
  /** Least time between two requests' starts. */
  intervalMs: number;
  /** Waits before retrying a failed request. */
  retryMs: number[];
  /** Waits before retrying a refusal (403, 429): NHTSA turns away a runner that asks too fast. */
  refusedMs: number[];
}

/**
 * About three requests a second, as build-nhtsa-backfill has always asked.
 * Four at once with no pause had NHTSA refuse GitHub's runner within a minute.
 */
export const NHTSA_PACING: Pacing = {
  intervalMs: 300,
  retryMs: [1_000, 4_000],
  refusedMs: [60_000, 180_000],
};

/** NHTSA stopped answering: the run should end and try again later. */
export class RefusedError extends Error {}

function client(pacing: Pacing) {
  let nextStart = 0;
  const paced = async () => {
    const now = Date.now();
    const start = Math.max(now, nextStart);
    nextStart = start + pacing.intervalMs;
    if (start > now) await wait(start - now);
  };

  return async function get<T>(path: string): Promise<T[]> {
    let retries = 0;
    let refusals = 0;
    for (;;) {
      await paced();
      try {
        const body = await fetchJson<Results<T>>(`${API}${path}`, TIMEOUT_MS);
        return Array.isArray(body?.Results) ? body.Results : [];
      } catch (error) {
        const status = error instanceof HttpError ? error.status : undefined;
        // A name NHTSA cannot look up ("C/K"): nothing listed under it.
        if (status === 400 || status === 404) return [];
        if (status === 403 || status === 429) {
          if (refusals >= pacing.refusedMs.length) throw new RefusedError((error as Error).message);
          await wait(pacing.refusedMs[refusals++]);
          continue;
        }
        if (retries >= pacing.retryMs.length) throw error;
        await wait(pacing.retryMs[retries++]);
      }
    }
  };
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
  /** NHTSA refused requests even after waiting: stop, and run again later. */
  refused: boolean;
  /** Rated variants without a photo on NHTSA's image host. */
  withoutPhoto: number;
}

export interface ListYearOptions {
  /** Only these makes (makeKey), the ones the site lists. */
  makes: Set<string>;
  /** Vehicles already fetched, by VehicleId: their photo is not asked for again. */
  known: Map<number, NhtsaPhotoVehicle>;
  concurrency?: number;
  pacing?: Pacing;
}

/** Every rated variant NHTSA lists for a model year, with its photo. */
export async function listYear(year: number, options: ListYearOptions): Promise<YearListing> {
  const { makes, known, concurrency = 2, pacing = NHTSA_PACING } = options;
  const get = client(pacing);
  const failures: string[] = [];
  let refused = false;
  let withoutPhoto = 0;
  const attempt = async <T>(path: string): Promise<T[] | undefined> => {
    // Once refused, ask nothing more this run.
    if (refused) return undefined;
    try {
      return await get<T>(path);
    } catch (error) {
      if (error instanceof RefusedError) refused = true;
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
    refused,
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
