import { DISPLAY_CURRENCY } from './currency';
import { formatEngineSystem, usesMpge } from './fuelDisplay';

/** Single label for missing / invalid field values across the app. */
export const UNAVAILABLE_LABEL = 'Not on file';

/**
 * "Not on file" framings — explain WHY data is absent, once and clearly, so it
 * reads as a known limitation of the source rather than a per-vehicle lookup miss.
 */
export const NHTSA_CHIP_UNAVAILABLE = 'No NHTSA rating';
export const NHTSA_UNAVAILABLE_VALUE = 'No rating found';
export const NHTSA_UNAVAILABLE_DETAIL = 'No NHTSA rating for this EPA configuration';
/** Many real vehicles are never tested — this is a legitimate state, not a bug. */
export const SAFETY_UNAVAILABLE_NOTE =
  'No NHTSA rating found for this specific EPA configuration. The vehicle may still share crash-test results with closely related trims or model years.';
/** EPA omits torque and 0–60; horsepower is filled from EPA test data when available. EV motor output may be manufacturer-estimated. */
export const PERFORMANCE_GAP_NOTE =
  'Torque and 0-60 times are not part of EPA fuel-economy records. Horsepower is shown when EPA rated it for this configuration; for many EVs we show manufacturer-rated motor output instead.';

export interface FormatOptions {
  suffix?: string;
  /** When true, 0 renders as "0" (e.g. tailpipe CO₂ on EVs). Default false. */
  allowZero?: boolean;
}

export function hasNumericValue(value: unknown, options: FormatOptions = {}): boolean {
  if (typeof value !== 'number' || Number.isNaN(value)) return false;
  if (value === 0 && !options.allowZero) return false;
  return true;
}

export function hasTextValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isUnavailableFormatted(text: string): boolean {
  return text === UNAVAILABLE_LABEL;
}

export function formatOrFallback(
  value: number | string | null | undefined,
  options: FormatOptions = {},
): string {
  if (typeof value === 'string') {
    return hasTextValue(value) ? value.trim() : UNAVAILABLE_LABEL;
  }
  if (!hasNumericValue(value, options)) return UNAVAILABLE_LABEL;
  const n = value as number;
  if (Number.isInteger(n) || options.suffix) {
    return `${Math.round(n)}${options.suffix ?? ''}`;
  }
  return `${n}${options.suffix ?? ''}`;
}

export function formatCurrencyOrFallback(value: number | null | undefined, isEstimated = false): string {
  if (!hasNumericValue(value)) return UNAVAILABLE_LABEL;
  const formatted = `$${Math.round(value!).toLocaleString()}`;
  if (isEstimated) return `${formatted} ${DISPLAY_CURRENCY} (est.)`;
  return `${formatted} ${DISPLAY_CURRENCY}`;
}

export function formatCurrencyRangeOrFallback(
  low?: number | null,
  high?: number | null,
  isEstimated = true,
): string {
  if (!hasNumericValue(low) || !hasNumericValue(high)) return UNAVAILABLE_LABEL;
  const suffix = isEstimated ? ` ${DISPLAY_CURRENCY} (est.)` : ` ${DISPLAY_CURRENCY}`;
  if (low === high) return formatCurrencyOrFallback(low, isEstimated);
  // Sub-$5k: show dollar precision — avoid fake "$1k-$1k" ranges.
  if ((high ?? 0) < 5000) {
    return `$${Math.round(low!).toLocaleString()}-$${Math.round(high!).toLocaleString()}${suffix}`;
  }
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  return `${fmt(low!)}-${fmt(high!)}${suffix}`;
}

const KM_PER_MILE = 1.609344;

export function formatCostPerKm(
  costPerMile: number | undefined | null,
  range?: { low?: number | null; high?: number | null },
): string {
  if (!hasNumericValue(costPerMile)) return UNAVAILABLE_LABEL;
  const perKm = costPerMile! / KM_PER_MILE;
  const mid = `$${perKm.toFixed(2)}/km ${DISPLAY_CURRENCY}`;
  if (range?.low != null && range?.high != null && range.low !== range.high) {
    const lowKm = range.low / KM_PER_MILE;
    const highKm = range.high / KM_PER_MILE;
    return `$${lowKm.toFixed(2)}-$${highKm.toFixed(2)}/km ${DISPLAY_CURRENCY}`;
  }
  return mid;
}

/** @deprecated Prefer formatCostPerKm for Canadian display. */
export function formatCostPerMile(
  value: number | undefined | null,
  range?: { low?: number | null; high?: number | null },
): string {
  if (!hasNumericValue(value)) return UNAVAILABLE_LABEL;
  const mid = `$${value!.toFixed(2)}/mi ${DISPLAY_CURRENCY}`;
  if (range?.low != null && range?.high != null && range.low !== range.high) {
    return `$${range.low.toFixed(2)}-$${range.high.toFixed(2)}/mi ${DISPLAY_CURRENCY}`;
  }
  return mid;
}

/** @deprecated Import from dataValue directly — kept for existing call sites. */
export function formatValue(value: number | string | undefined | null, suffix = ''): string {
  return formatOrFallback(value, { suffix });
}

export function formatCurrency(value: number | undefined | null, isEstimated?: boolean): string {
  return formatCurrencyOrFallback(value, isEstimated);
}

export function formatCurrencyRange(
  low?: number | null,
  high?: number | null,
  isEstimated = true,
): string {
  return formatCurrencyRangeOrFallback(low, high, isEstimated);
}

/** Muted styling when a formatted value is unavailable. */
export function unavailableClass(value: string, base = 'font-semibold mt-0.5'): string {
  return isUnavailableFormatted(value)
    ? `${base} text-zinc-600 italic font-normal text-xs`
    : `${base} text-white`;
}

export function formatEngineForCard(fuelType: string, displacement?: number | null): string {
  if (usesMpge(fuelType)) {
    return fuelType === 'hydrogen' ? 'FCEV' : 'EV';
  }
  return formatOrFallback(displacement, { suffix: 'L' });
}

/** Engine line with displacement + layout when EPA carries both. */
export function formatEngineDetailForCard(engine: {
  fuelType: string;
  displacement?: number | null;
  configuration?: string;
  cylinders?: number;
}): string {
  if (usesMpge(engine.fuelType)) {
    return engine.fuelType === 'hydrogen' ? 'FCEV' : 'Electric';
  }
  const parts: string[] = [];
  if (hasNumericValue(engine.displacement)) parts.push(`${engine.displacement}L`);
  if (engine.configuration) parts.push(engine.configuration);
  else if (hasNumericValue(engine.cylinders)) parts.push(`${engine.cylinders}-cyl`);
  return parts.length ? parts.join(' ') : formatEngineForCard(engine.fuelType, engine.displacement);
}

/** Full engine descriptor for detail views. */
export function formatEngineForDetail(engine: {
  fuelType: string;
  displacement?: number | null;
  configuration?: string;
  cylinders?: number;
}): string {
  return formatEngineSystem(
    engine.fuelType,
    engine.displacement,
    engine.configuration,
    engine.cylinders,
  );
}

export function formatPowerForCard(
  horsepower?: number | null,
  _options?: { fuelType?: string; powerProvenance?: string },
): string {
  if (hasNumericValue(horsepower)) {
    return `${Math.round(horsepower!)} HP`;
  }
  if (_options?.fuelType && usesMpge(_options.fuelType)) {
    return 'Not in EPA dataset';
  }
  return UNAVAILABLE_LABEL;
}

export function formatRangeForCard(rangeMiles?: number | null): string {
  if (!hasNumericValue(rangeMiles)) return UNAVAILABLE_LABEL;
  return `${Math.round(rangeMiles!)} mi`;
}

export function formatConfidenceLabel(confidence?: 'low' | 'medium' | 'high'): string | null {
  if (!confidence) return null;
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export function formatMpgForCard(combined?: number | null): string {
  return formatOrFallback(combined);
}

export function formatPriceShort(msrp?: number | null, isEstimated = false): string {
  if (!hasNumericValue(msrp)) return UNAVAILABLE_LABEL;
  const base = `$${Math.round(msrp! / 1000)}k`;
  return isEstimated ? `${base} ${DISPLAY_CURRENCY}` : base;
}

export function cardStatClass(value: string): string {
  return isUnavailableFormatted(value)
    ? 'text-lg font-bold text-zinc-600 italic text-sm'
    : 'text-lg font-bold';
}
