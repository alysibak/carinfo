import type { Car } from '../types/car.types.js';
import { isFuelCellVehicle } from './fuel-cell-detection.js';
import { inferEffectiveFuelType, isLikelyMisclassifiedPhev } from './fuel-type-inference.js';
import { unvaluedReason } from './unvalued.js';
import { engineLayout } from './engine-layout.js';
import { estimateMarketValue } from './ownership-economics.js';
import { applyVehicleTaxonomy } from './vehicle-taxonomy-apply.js';
import { deriveVariant } from './performance-trims.js';

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
  // No price for a collector car or one never sold to the public: listings,
  // sorting and the value chart would otherwise show a depreciation figure
  // an order of magnitude off, or a price nobody can pay.
  if (unvaluedReason(normalized)) {
    const { price: _price, ...car } = normalized;
    const { 'price.msrp': _source, ...provenance } = normalized.provenance;
    return { ...car, provenance };
  }
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

/**
 * EPA stores `displ = 0` for some battery-electric rows (e.g. Mitsubishi
 * i-MiEV). Zero is not "unknown", it is a claim — a 0.0 L engine — and any
 * consumer that does not special-case EVs will print it. An engineless
 * vehicle's displacement is absent, not zero.
 */
/**
 * EPA's "AV" and "AV-S7" codes are continuously variable transmissions, the
 * number being the stepped modes a select shift simulates. The import read
 * only "variable gear ratios" as a CVT, so 938 Civics, Legacys, Elantras and
 * Toyota hybrids were "7-Speed", "8-Speed" or "1-Speed Automatic".
 */
export const EPA_CVT_CODE = /\(AV(?:-S\d+)?\)/i;

function readCvtCode(car: Car): Car {
  const t = car.transmission;
  if (!t || t.type === 'cvt' || !EPA_CVT_CODE.test(t.description ?? '')) return car;
  return { ...car, transmission: { ...t, type: 'cvt' } };
}

function dropPhantomDisplacement(car: Car): Car {
  const { fuelType, displacement } = car.engine;
  if (displacement !== 0) return car;
  if (fuelType !== 'electric' && fuelType !== 'hydrogen') return car;
  const { displacement: _dropped, ...engine } = car.engine;
  return { ...car, engine };
}

/**
 * All-wheel drive EPA recorded as two-wheel drive against the car's own name
 * and size class: a 2011 ML350 and R350 "4matic", a 2014 Range Rover Sport.
 */
const AWD_NAME = /\b(?:awd|4wd|4x4|4matic|xdrive|quattro|4motion|all4)\b/i;
const TWO_WD_NAME = /\b(?:fwd|rwd|2wd|sdrive|4x2)\b/i;

function correctDriveType(car: Car): Car {
  if (car.driveType !== 'FWD' && car.driveType !== 'RWD') return car;
  const alwaysDriven =
    car.make === 'Land Rover' ||
    (car.make === 'BMW' && /^x5\b/i.test(car.model) && car.year <= 2006);
  const named = AWD_NAME.test(car.model) && !TWO_WD_NAME.test(car.model);
  if (!alwaysDriven && !named) return car;
  return {
    ...car,
    driveType: car.make === 'Land Rover' ? '4WD' : 'AWD',
    provenance: { ...car.provenance, driveType: 'estimated' },
  };
}

export function normalizeCarRecord(car: Car): Car {
  let normalized = correctDriveType(car);

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

  if (
    isLikelyMisclassifiedPhev(normalized) ||
    inferEffectiveFuelType(normalized) !== normalized.engine.fuelType
  ) {
    normalized = applyFuelTypeCorrection(normalized);
  }

  // After the fuel corrections: a 48 V mild hybrid marks the newer straight sixes.
  const layout = engineLayout(normalized);
  if (layout !== normalized.engine.configuration) {
    const { configuration: _guess, ...engine } = normalized.engine;
    normalized = { ...normalized, engine: layout ? { ...engine, configuration: layout } : engine };
  }

  // Before the taxonomy, which reads the trim to place the car in a segment.
  const variant = deriveVariant(normalized);
  if (variant && normalized.variant !== variant) {
    normalized = {
      ...normalized,
      variant,
      provenance: { ...normalized.provenance, variant: 'estimated' },
    };
  }

  normalized = applyVehicleTaxonomy(normalized);
  normalized = dropPhantomDisplacement(normalized);
  normalized = readCvtCode(normalized);

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
      text: 'Not rated. Hydrogen price varies by station and region',
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
