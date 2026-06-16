import type { Car } from '../types/car.types.js';
import { resolveVehicleTaxonomy } from './vehicle-taxonomy.js';
import {
  estimatePerformanceHorsepower,
  shouldOverrideHorsepower,
} from './performance-hp-estimates.js';

/** Apply body-style, model, category, and performance corrections at load/search time. */
export function applyVehicleTaxonomy(car: Car): Car {
  const taxonomy = resolveVehicleTaxonomy(car);
  let next: Car = {
    ...car,
    model: taxonomy.displayModel,
    bodyStyle: taxonomy.bodyStyle,
    vehicleCategory: taxonomy.vehicleCategory,
    shoppingSegment: taxonomy.shoppingSegment,
    ownershipProfile: taxonomy.ownershipProfile,
  };

  const perfHp = estimatePerformanceHorsepower(next);
  const currentHp = next.engine.horsepower;
  if (perfHp != null && shouldOverrideHorsepower(next, currentHp)) {
    next = {
      ...next,
      engine: { ...next.engine, horsepower: perfHp },
      provenance: {
        ...next.provenance,
        'engine.horsepower': currentHp != null ? 'estimated' : (next.provenance['engine.horsepower'] ?? 'estimated'),
      },
    };
  }

  const prov = { ...next.provenance };
  if (taxonomy.bodyStyle !== car.bodyStyle) prov.bodyStyle = 'estimated';
  if (taxonomy.displayModel !== car.model) prov.model = 'estimated';
  if (taxonomy.vehicleCategory) prov.vehicleCategory = 'estimated';
  if (taxonomy.shoppingSegment) prov.shoppingSegment = 'estimated';

  return { ...next, provenance: prov };
}
