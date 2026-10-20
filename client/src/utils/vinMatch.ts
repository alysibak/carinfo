import type { CarSpecs, DriveType } from '../types/car.types';

/** vPIC's drive ("AWD/All-Wheel Drive", "4WD/4-Wheel Drive/4x4") as the catalog files it. */
export function vinDriveType(drive: string | undefined): DriveType | null {
  if (!drive) return null;
  if (/^AWD|all[- ]wheel/i.test(drive)) return 'AWD';
  if (/^4WD|4x4|four[- ]wheel|4-wheel/i.test(drive)) return '4WD';
  if (/^FWD|front[- ]wheel/i.test(drive)) return 'FWD';
  if (/^RWD|rear[- ]wheel|4x2/i.test(drive)) return 'RWD';
  return null;
}

/**
 * The catalog car a decoded VIN is: its make and model year, and its drive
 * where the VIN gives one and the catalog lists it. The model year's recalls
 * and complaints are the same for every configuration; the crash ratings are
 * the drive's.
 */
export function vinCatalogCar(
  decoded: { year?: number; make?: string; driveType?: string },
  results: CarSpecs[],
): CarSpecs | null {
  if (!decoded.year || !decoded.make) return null;
  const make = decoded.make.toLowerCase();
  const sameYear = results.filter(
    (car) => car.year === decoded.year && car.make.toLowerCase() === make,
  );
  const drive = vinDriveType(decoded.driveType);
  return sameYear.find((car) => drive && car.driveType === drive) ?? sameYear[0] ?? null;
}
