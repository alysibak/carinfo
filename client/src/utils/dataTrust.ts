import type { CarDashboard, CarSpecs, Provenance, ProvenanceSource } from '../types/car.types';
import type { SpecGlossaryKey } from './specGlossary';
import { hasNumericValue, hasTextValue } from './dataValue';
import { formatAnnualFuelCostCadDisplay } from './fuelLabels';

export type TrustFilter = 'all' | 'verified' | 'estimated';

export function isVerifiedSource(source: ProvenanceSource): boolean {
  return source === 'epa' || source === 'nhtsa' || source === 'curated';
}

/** Single map from provenance field key to human label for Data Sources and related trust UI. */
export const PROVENANCE_FIELD_LABELS: Record<string, string> = {
  bodyStyle: 'Body style',
  'engine.cylinders': 'Cylinders',
  'engine.displacement': 'Engine displacement',
  'engine.horsepower': 'Horsepower',
  'engine.fuelType': 'Fuel type',
  fuelType: 'Fuel type',
  'epa.annualFuelCost': 'Annual fuel cost',
  'epa.charge120Hours': '120V charge time',
  'epa.charge240Hours': '240V charge time',
  'epa.co2': 'CO₂ emissions',
  'epa.rangeMiles': 'EPA range',
  'epa.kWhPer100Mi': 'Energy consumption',
  'fuelEconomy.city': 'City fuel economy',
  'fuelEconomy.highway': 'Highway fuel economy',
  'fuelEconomy.combined': 'Combined fuel economy',
  driveType: 'Drivetrain',
  transmission: 'Transmission',
  make: 'Make',
  model: 'Model',
  year: 'Year',
  countryOfOrigin: 'Origin',
  safetyRating: 'Crash safety',
  'price.msrp': 'Est. current value',
  'analytics.annualCost': 'Annual running cost',
  'analytics.tco5Year': '5-year total cost',
  'performance.zeroToSixty': '0-60 mph',
};

export function provenanceFieldLabel(key: string): string | null {
  return PROVENANCE_FIELD_LABELS[key] ?? null;
}

/** Glossary keys for Data Sources rows that have explainer copy. */
export const PROVENANCE_GLOSSARY_KEYS: Partial<Record<string, SpecGlossaryKey>> = {
  bodyStyle: 'body',
  'engine.cylinders': 'cylinders',
  'engine.displacement': 'displacement',
  'engine.horsepower': 'horsepower',
  'engine.fuelType': 'fuel',
  fuelType: 'fuel',
  'epa.annualFuelCost': 'annualFuelCost',
  'epa.charge120Hours': 'charge120',
  'epa.charge240Hours': 'charge240',
  'epa.co2': 'co2',
  'epa.rangeMiles': 'epaRange',
  'epa.kWhPer100Mi': 'kwhPer100mi',
  'fuelEconomy.city': 'mpgCity',
  'fuelEconomy.highway': 'mpgHighway',
  'fuelEconomy.combined': 'mpgCombined',
  driveType: 'drivetrain',
  transmission: 'transmission',
  countryOfOrigin: 'countryOfOrigin',
  safetyRating: 'safetyOverall',
  'price.msrp': 'msrp',
  'performance.zeroToSixty': 'zeroToSixty',
};

export function provenanceGlossaryKey(fieldKey: string): SpecGlossaryKey | undefined {
  return PROVENANCE_GLOSSARY_KEYS[fieldKey];
}

/** How a provenance field should read in trust UI (display may differ from raw stored source). */
export function displayProvenanceSource(key: string, source: ProvenanceSource): ProvenanceSource {
  if (key === 'epa.annualFuelCost') return 'estimated';
  return source;
}

function provenanceFieldHasValue(dashboard: CarDashboard, key: string): boolean {
  const { car, ownership, evCharge, zeroToSixty } = dashboard;

  switch (key) {
    case 'make':
      return hasTextValue(car.make);
    case 'model':
      return hasTextValue(car.model);
    case 'year':
      return hasNumericValue(car.year);
    case 'bodyStyle':
      return hasTextValue(car.bodyStyle);
    case 'driveType':
      return hasTextValue(car.driveType);
    case 'transmission':
      return hasTextValue(car.transmission?.type);
    case 'engine.cylinders':
      return hasNumericValue(car.engine.cylinders);
    case 'engine.displacement':
      return hasNumericValue(car.engine.displacement);
    case 'engine.horsepower':
      return hasNumericValue(car.engine.horsepower);
    case 'engine.fuelType':
    case 'fuelType':
      return hasTextValue(car.engine.fuelType);
    case 'fuelEconomy.city':
      return hasNumericValue(car.fuelEconomy.city);
    case 'fuelEconomy.highway':
      return hasNumericValue(car.fuelEconomy.highway);
    case 'fuelEconomy.combined':
      return hasNumericValue(car.fuelEconomy.combined);
    case 'epa.annualFuelCost':
      return (
        formatAnnualFuelCostCadDisplay(car) != null || hasNumericValue(car.epa?.annualFuelCost)
      );
    case 'epa.charge120Hours':
      return hasNumericValue(evCharge?.charge120Hours ?? car.epa?.charge120Hours);
    case 'epa.charge240Hours':
      return hasNumericValue(evCharge?.charge240Hours ?? car.epa?.charge240Hours);
    case 'epa.co2':
      return car.epa?.co2 != null;
    case 'epa.rangeMiles':
      return hasNumericValue(evCharge?.rangeMiles ?? car.epa?.rangeMiles);
    case 'epa.kWhPer100Mi':
      return hasNumericValue(evCharge?.kWhPer100Mi ?? car.epa?.kWhPer100Mi);
    case 'countryOfOrigin':
      return hasTextValue(car.countryOfOrigin);
    case 'safetyRating':
      return hasNumericValue(car.safetyRating?.overall, { allowZero: false });
    case 'price.msrp':
      return hasNumericValue(car.price?.msrp) || hasNumericValue(ownership.marketValue.mid);
    case 'analytics.annualCost':
      return ownership.annualCost.total != null || ownership.annualCost.energy != null;
    case 'analytics.tco5Year':
      return ownership.tco5Year != null;
    case 'performance.zeroToSixty':
      return zeroToSixty != null && hasNumericValue(zeroToSixty.value);
    default:
      return false;
  }
}

export interface ProvenanceEntry {
  key: string;
  label: string;
  source: ProvenanceSource;
  confidence?: string;
}

export function buildProvenanceEntries(dashboard: CarDashboard): ProvenanceEntry[] {
  const { car, fieldProvenance, zeroToSixty } = dashboard;
  const merged: Provenance = { ...(car.provenance ?? {}), ...fieldProvenance };
  const entries: ProvenanceEntry[] = [];

  for (const [key, source] of Object.entries(merged)) {
    if (!source) continue;
    if (!provenanceFieldHasValue(dashboard, key)) continue;
    const label = provenanceFieldLabel(key);
    if (!label) {
      console.warn(`[dataTrust] Unmapped provenance field key skipped: ${key}`);
      continue;
    }
    entries.push({
      key,
      label,
      source: displayProvenanceSource(key, source),
    });
  }

  if (zeroToSixty && provenanceFieldHasValue(dashboard, 'performance.zeroToSixty')) {
    entries.push({
      key: 'performance.zeroToSixty',
      label: provenanceFieldLabel('performance.zeroToSixty')!,
      source: zeroToSixty.method === 'actual' ? 'curated' : 'estimated',
      confidence: zeroToSixty.confidence,
    });
  }

  const order = ['price.msrp', 'analytics.annualCost', 'analytics.tco5Year', 'engine.horsepower'];
  entries.sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return entries;
}

export function mergedProvenance(dashboard: CarDashboard): Provenance {
  return { ...(dashboard.car.provenance ?? {}), ...dashboard.fieldProvenance };
}

export function fieldProvenanceSource(
  dashboard: CarDashboard,
  key: string,
): ProvenanceSource | null {
  return mergedProvenance(dashboard)[key] ?? null;
}

export function fieldConfidence(dashboard: CarDashboard, key: string): string | undefined {
  if (key === 'price.msrp') return dashboard.ownership.marketValue.confidenceLabel;
  if (key === 'analytics.annualCost' || key === 'analytics.tco5Year') {
    return dashboard.ownership.marketValue.confidenceLabel;
  }
  if (key === 'performance.zeroToSixty') return dashboard.zeroToSixty?.confidence;
  return undefined;
}

export function filterProvenanceEntries(
  entries: ProvenanceEntry[],
  filter: TrustFilter,
): ProvenanceEntry[] {
  if (filter === 'all') return entries;
  if (filter === 'verified') return entries.filter((e) => isVerifiedSource(e.source));
  return entries.filter((e) => e.source === 'estimated');
}

export function compareFieldProvenance(car: CarSpecs): ProvenanceEntry[] {
  const entries: ProvenanceEntry[] = [];
  const push = (key: string, label: string, source: ProvenanceSource, confidence?: string) => {
    entries.push({ key, label, source, confidence });
  };

  if (car.provenance?.['engine.horsepower']) {
    push('engine.horsepower', 'Horsepower', car.provenance['engine.horsepower']);
  }
  if (car.fuelEconomy?.combined) {
    push('fuelEconomy.combined', 'Fuel economy', car.provenance?.['fuelEconomy.combined'] ?? 'epa');
  }
  if (car.price?.msrp) {
    push(
      'price.msrp',
      'Est. value',
      car.provenance?.['price.msrp'] ?? (car.price.isEstimated ? 'estimated' : 'epa'),
      car.price.confidenceLabel,
    );
  }
  if (car.safetyRating?.overall) {
    push('safetyRating', 'Safety', car.provenance?.safetyRating ?? 'nhtsa');
  }

  return entries;
}
