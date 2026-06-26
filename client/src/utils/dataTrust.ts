import type { CarDashboard, CarSpecs, Provenance, ProvenanceSource } from '../types/car.types';

export type TrustFilter = 'all' | 'verified' | 'estimated';

export function isVerifiedSource(source: ProvenanceSource): boolean {
  return source === 'epa' || source === 'nhtsa' || source === 'curated';
}

const FIELD_LABELS: Record<string, string> = {
  'price.msrp': 'Market value',
  'analytics.annualCost': 'Annual running cost',
  'analytics.tco5Year': '5-year total cost',
  'engine.horsepower': 'Horsepower',
  'engine.fuelType': 'Fuel type',
  'fuelEconomy.combined': 'Fuel economy',
  'safetyRating': 'Crash safety',
  'engine.displacement': 'Engine displacement',
};

export interface ProvenanceEntry {
  key: string;
  label: string;
  source: ProvenanceSource;
  confidence?: string;
}

export function buildProvenanceEntries(dashboard: CarDashboard): ProvenanceEntry[] {
  const { car, fieldProvenance, zeroToSixty, ownership } = dashboard;
  const merged: Provenance = { ...(car.provenance ?? {}), ...fieldProvenance };
  const entries: ProvenanceEntry[] = [];

  for (const [key, source] of Object.entries(merged)) {
    if (!source) continue;
    const label = FIELD_LABELS[key] ?? key;
    const confidence =
      key === 'price.msrp' ? ownership.marketValue.confidenceLabel : undefined;
    entries.push({ key, label, source, confidence });
  }

  if (zeroToSixty) {
    entries.push({
      key: 'performance.zeroToSixty',
      label: '0–60 mph',
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
