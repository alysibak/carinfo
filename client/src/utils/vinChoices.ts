import type { CarSpecs } from '../types/car.types';
import { bodyStyleLabel } from './bodyStyleLabel';
import { engineLayoutLabel, engineLitres, formatFuelTypeLabel } from './fuelDisplay';
import { displayModelLabel, displayTransmissionLabel } from './trimLabel';

/**
 * What tells apart the versions a VIN fits, a line for each: only what
 * differs between them ("5-Speed Automatic" and "6-Speed Manual" for two
 * 2003 Accord V6s), so the line says how to pick. Empty for a car whose
 * versions differ in nothing on file.
 */
export function vinChoiceNotes(cars: CarSpecs[]): Record<string, string> {
  if (cars.length < 2) return {};
  const traits: Array<(car: CarSpecs) => string | null> = [
    (car) => displayModelLabel(car),
    (car) => formatFuelTypeLabel(car.engine.fuelType),
    (car) =>
      [
        car.engine.displacement ? engineLitres(car.engine.displacement) : null,
        engineLayoutLabel(car.engine.configuration, car.engine.cylinders),
      ]
        .filter(Boolean)
        .join(' ') || null,
    (car) => displayTransmissionLabel(car.transmission),
    (car) => car.driveType,
    (car) => bodyStyleLabel(car.bodyStyle),
  ];
  // The traits whose values are not the same for every version.
  const telling = traits.filter((trait) => new Set(cars.map(trait)).size > 1);
  const notes: Record<string, string> = {};
  for (const car of cars) {
    const line = telling
      .map((trait) => trait(car))
      .filter(Boolean)
      .join(' · ');
    if (line) notes[car.id] = line;
  }
  return notes;
}
