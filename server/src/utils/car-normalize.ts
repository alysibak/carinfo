import type { Car } from '../types/car.types.js';
import { isFuelCellVehicle } from './fuel-cell-detection.js';
import { inferEffectiveFuelType, isLikelyMisclassifiedPhev } from './fuel-type-inference.js';
import { estimateMarketValue } from './ownership-economics.js';
import { applyVehicleTaxonomy } from './vehicle-taxonomy-apply.js';

export { isFuelCellVehicle } from './fuel-cell-detection.js';

function applyFuelTypeCorrection(car: Car): Car {
  const corrected = inferEffectiveFuelType(car);
  if (corrected === car.engine.fuelType) return car;

  return {
    ...car,
    engine: { ...car.engine, fuelType: corrected },
    provenance: {
      ...car.provenance,
      'engine.fuelType': 'estimated',
    },
  };
}

function applyMarketValue(normalized: Car): Car {
  if (normalized.price?.isEstimated === false && (normalized.price?.msrp ?? 0) > 0) {
    return normalized;
  }

  const market = estimateMarketValue(normalized);
  return {
    ...normalized,
    price: {
      msrp: market.mid,
      min: market.low,
      max: market.high,
      isEstimated: true,
      confidence: market.confidence,
      confidenceLabel: market.confidenceLabel,
    },
    provenance: {
      ...normalized.provenance,
      'price.msrp': 'estimated',
    },
  };
}

export function normalizeCarRecord(car: Car): Car {
  let normalized = car;

  if (isFuelCellVehicle(normalized)) {
    normalized = {
      ...normalized,
      engine: { ...normalized.engine, fuelType: 'hydrogen' },
      provenance: {
        ...normalized.provenance,
        'engine.fuelType': 'estimated',
      },
    };
  }

  if (isLikelyMisclassifiedPhev(normalized) || inferEffectiveFuelType(normalized) !== normalized.engine.fuelType) {
    normalized = applyFuelTypeCorrection(normalized);
  }

  normalized = applyVehicleTaxonomy(normalized);

  return applyMarketValue(normalized);
}

export function efficiencyLabel(car: Car): 'MPG' | 'MPGe' {
  const ft = inferEffectiveFuelType(car);
  if (ft === 'electric' || ft === 'hydrogen') return 'MPGe';
  return 'MPG';
}

/** EPA often stores fuelCost08 = 0 for hydrogen; do not treat as free fuel. */
export function formatAnnualFuelCost(car: Car): { text: string; isReliable: boolean } {
  const cost = car.epa?.annualFuelCost;
  if (car.engine.fuelType === 'hydrogen') {
    if (cost != null && cost > 0) {
      return { text: `$${cost.toLocaleString()}/yr (EPA est.)`, isReliable: true };
    }
    return {
      text: 'Not rated — hydrogen price varies by station & region',
      isReliable: false,
    };
  }
  if (cost != null && cost > 0) {
    return { text: `$${cost.toLocaleString()}/yr fuel`, isReliable: true };
  }
  if (cost === 0) {
    return { text: 'Not available from EPA', isReliable: false };
  }
  return { text: '', isReliable: false };
}
