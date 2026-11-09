import type { BodyStyle, Car, DriveType, FuelType } from '../types/car.types.js';
import { getAllCars, modelLineKey } from './car.service.js';
import type { VinDecodeResult } from './nhtsa.service.js';

/**
 * The cars here a decoded VIN is. NHTSA names the model year, make and model
 * and, for most VINs, the engine, drive and body; the catalog holds each
 * version EPA rated. The VIN page linked the first car the search for
 * "2003 Honda Accord" returned, a 2.4-litre four, for a VIN that decodes to
 * the 3.0-litre V6: the versions are told apart here by what the VIN says.
 */

/** At most this many versions offered when the VIN cannot tell them apart. */
const MOST_CHOICES = 8;

export interface VinCatalogMatch {
  /**
   * The versions the VIN fits best, likeliest first: one where the VIN
   * tells the year's versions apart, several where it does not.
   */
  cars: Car[];
  /**
   * What chose them: the VIN's engine, drive, body or gearbox ('version'),
   * or only its model, make and year ('year'), when it says nothing more.
   */
  basis: 'version' | 'year';
}

/** vPIC's drive ("AWD/All-Wheel Drive", "4WD/4-Wheel Drive/4x4", "4x2") as the catalog files it. */
export function vinDrive(drive: string | undefined): DriveType | null {
  if (!drive) return null;
  if (/^AWD|all[- ]wheel/i.test(drive)) return 'AWD';
  if (/^4WD|4x4|four[- ]wheel|4-wheel/i.test(drive)) return '4WD';
  if (/^FWD|front[- ]wheel/i.test(drive)) return 'FWD';
  if (/^RWD|rear[- ]wheel|4x2/i.test(drive)) return 'RWD';
  return null;
}

/** What the car runs on, from vPIC's fuel and electrification fields. */
export function vinFuel(engine: VinDecodeResult['engine']): FuelType | null {
  const level = (engine.electrification ?? '').toLowerCase();
  const fuel = (engine.fuelPrimary ?? '').toLowerCase();
  if (/\bphev\b|plug-in/.test(level)) return 'plug-in hybrid';
  if (/\bbev\b|battery electric/.test(level)) return 'electric';
  if (/\bfcev\b|fuel cell/.test(level) || /hydrogen|fuel cell/.test(fuel)) return 'hydrogen';
  // A mild hybrid's motor never drives the car: the catalog files it by its engine's fuel.
  if (/\bhev\b|hybrid electric/.test(level) && !/mild/.test(level)) return 'hybrid';
  if (fuel.includes('electric') && !/gasoline|diesel/.test(fuel)) return 'electric';
  if (fuel.includes('diesel')) return 'diesel';
  if (/natural gas|\bcng\b/.test(fuel)) return 'natural gas';
  if (/gasoline|flexible fuel|ethanol/.test(fuel)) return 'gasoline';
  return null;
}

/** vPIC's body class ("Sedan/Saloon", "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)"). */
export function vinBody(bodyClass: string | undefined): BodyStyle | null {
  const body = (bodyClass ?? '').toLowerCase();
  if (!body) return null;
  if (body.includes('pickup')) return 'truck';
  if (body.includes('minivan')) return 'minivan';
  if (/sport utility|\bsuv\b|crossover|multi-purpose/.test(body)) return 'suv';
  if (/convertible|cabriolet|roadster/.test(body)) return 'convertible';
  if (body.includes('coupe')) return 'coupe';
  if (body.includes('wagon')) return 'wagon';
  if (/hatchback|liftback/.test(body)) return 'hatchback';
  if (/sedan|saloon/.test(body)) return 'sedan';
  if (body.includes('van')) return 'van';
  return null;
}

/** vPIC's transmission style ("Automatic", "Manual/Standard", "Continuously Variable Transmission (CVT)"). */
export function vinGearbox(style: string | undefined): Car['transmission']['type'] | null {
  const gearbox = (style ?? '').toLowerCase();
  if (!gearbox) return null;
  if (/dual[- ]clutch|\bdct\b/.test(gearbox)) return 'dual-clutch';
  if (/continuously|\bcvt\b/.test(gearbox)) return 'cvt';
  if (/manual|standard/.test(gearbox)) return 'manual';
  if (gearbox.includes('automatic')) return 'automatic';
  return null;
}

/** A name with only its letters and digits, lower case: "F-150" and "F150 Pickup" as "f150", "f150pickup". */
const bare = (name: string | undefined) => (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * How surely a catalog car is the VIN's model: the same model line (3); a
 * name that begins with the VIN's ("F150 Pickup 4WD" for "F-150") (2); one
 * that begins with its series, or shares its first word, as BMW's "330i"
 * for "3-Series", series "330i" (1); else none (0).
 */
function modelFit(car: Car, decoded: VinDecodeResult, line: string): number {
  if (modelLineKey(car) === line) return 3;
  const name = bare(car.model);
  const model = bare(decoded.model);
  if (model.length >= 2 && name.startsWith(model)) return 2;
  const series = bare(decoded.series);
  if (series.length >= 2 && name.startsWith(series)) return 1;
  const first = (text: string | undefined) => (text ?? '').toLowerCase().split(/[\s-]+/)[0] ?? '';
  const word = first(decoded.model);
  if (word.length >= 3 && /^[a-z]+$/.test(word) && first(car.model) === word) return 1;
  return 0;
}

/**
 * How well a version agrees with what the VIN says of it. Each fact the VIN
 * gives and the car shares counts for it ("evidence"); one that differs
 * counts against it, the fuel and the engine's size most.
 */
function versionScore(car: Car, decoded: VinDecodeResult): { score: number; evidence: number } {
  let score = 0;
  let evidence = 0;
  const agree = (points: number) => {
    score += points;
    evidence += 1;
  };
  const engine = decoded.engine;

  const fuel = vinFuel(engine);
  if (fuel) {
    if (car.engine.fuelType === fuel) agree(4);
    else score -= 6;
  }
  if (engine.displacementL && car.engine.displacement) {
    if (Math.abs(engine.displacementL - car.engine.displacement) <= 0.15) agree(3);
    else score -= 4;
  }
  if (engine.cylinders && car.engine.cylinders) {
    if (engine.cylinders === car.engine.cylinders) agree(2);
    else score -= 3;
  }
  if (engine.turbo != null && car.engine.fuelType !== 'electric') {
    const boosted = car.engine.aspiration != null;
    if (engine.turbo && boosted) agree(1);
    else if (!engine.turbo && boosted) score -= 1;
  }

  const drive = vinDrive(decoded.driveType);
  if (drive) {
    if (car.driveType === drive) agree(2);
    // EPA files many all-wheel-drive SUVs as 4WD, and the reverse.
    else if (/^(AWD|4WD)$/.test(car.driveType) && /^(AWD|4WD)$/.test(drive)) agree(1);
    else score -= 2;
  }

  const body = vinBody(decoded.bodyClass);
  if (body) {
    if (car.bodyStyle === body) agree(1);
    else score -= 1;
  }

  const gearbox = vinGearbox(decoded.transmission);
  if (gearbox) {
    const type = car.transmission.type;
    if (type === gearbox) agree(1);
    // EPA calls some CVTs and dual-clutch boxes automatics.
    else if (gearbox === 'manual' || type === 'manual') score -= 2;
  }
  const speeds = Number.parseInt(decoded.transmissionSpeeds ?? '', 10);
  if (Number.isFinite(speeds) && car.transmission.speeds) {
    if (car.transmission.speeds === speeds) agree(1);
  }

  // The series or trim in the version's name: a Wrangler of series "Unlimited
  // Sport" is the Wrangler Unlimited, not the two-door.
  const name = car.model.toLowerCase();
  const words = `${decoded.series ?? ''} ${decoded.trim ?? ''}`.toLowerCase().match(/[a-z]{4,}/g);
  if (words?.some((word) => !PLAIN_WORDS.has(word) && name.includes(word))) agree(1);
  // A version named for a body the VIN's is not: the GLC Coupe, for a GLC SUV.
  const named = /\b(coupe|convertible|cabriolet|roadster|wagon|hatchback|sedan)\b/.exec(name)?.[1];
  if (named && body && NAMED_BODY[named] !== body) score -= 2;

  return { score, evidence };
}

/** Words of a series or trim that say nothing of which version it is. */
const PLAIN_WORDS = new Set(['base', 'door', 'doors', 'drive', 'wheel', 'automatic', 'manual']);

/** The body a version's name gives it. */
const NAMED_BODY: Record<string, BodyStyle> = {
  coupe: 'coupe',
  convertible: 'convertible',
  cabriolet: 'convertible',
  roadster: 'convertible',
  wagon: 'wagon',
  hatchback: 'hatchback',
  sedan: 'sedan',
};

/** The base version first, as the model-year page lists them: cheaper, then by id. */
function baseFirst(a: Car, b: Car): number {
  const price = (a.price?.msrp ?? 1e12) - (b.price?.msrp ?? 1e12);
  return price !== 0 ? price : a.id.localeCompare(b.id);
}

/**
 * The catalog's versions a decoded VIN fits best (see VinCatalogMatch), or
 * null where none of its model year, make and model is on file.
 */
export function catalogCarsForVin(
  decoded: VinDecodeResult,
  cars: Car[] = getAllCars(),
): VinCatalogMatch | null {
  if (!decoded.year || !decoded.make || !decoded.model) return null;
  const make = decoded.make.toLowerCase();
  const sameYear = cars.filter(
    (car) => car.year === decoded.year && car.make.toLowerCase() === make,
  );
  if (sameYear.length === 0) return null;

  // The decoded model's line, keyed with the catalog's spelling of the make.
  const line = modelLineKey({ make: sameYear[0].make, model: decoded.model });
  const fits = sameYear.map((car) => ({ car, fit: modelFit(car, decoded, line) }));
  const best = Math.max(...fits.map((entry) => entry.fit));
  if (best === 0) return null;

  const scored = fits
    .filter((entry) => entry.fit === best)
    .map(({ car }) => ({ car, ...versionScore(car, decoded) }));
  const top = Math.max(...scored.map((entry) => entry.score));
  const leaders = scored.filter((entry) => entry.score === top);
  leaders.sort((a, b) => baseFirst(a.car, b.car));
  return {
    cars: leaders.slice(0, MOST_CHOICES).map((entry) => entry.car),
    basis: leaders.some((entry) => entry.evidence > 0) ? 'version' : 'year',
  };
}
