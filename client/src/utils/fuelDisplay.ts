import type { CarSpecs } from '../types/car.types';

const FCEV_NAME_RE =
  /\b(fuel\s*cell|fcv|fcev|mirai|nexo)\b/i;

/** Client-side mirror of server fuel-cell detection (API data is normalized, but guards stale cache). */
export function isFuelCellVehicle(car: CarSpecs): boolean {
  if (car.engine.fuelType === 'hydrogen') return true;

  const key = `${car.make} ${car.model} ${car.trim ?? ''}`;
  if (FCEV_NAME_RE.test(key)) return true;

  const ft = (car.engine.fuelType ?? '').toLowerCase();
  if (ft.includes('hydrogen') || ft.includes('fuel cell')) return true;

  const mpge = car.fuelEconomy.combined ?? 0;
  const hasEvRange = (car.epa?.rangeMiles ?? 0) > 0;
  const hasKwh = car.epa?.kWhPer100Mi != null && car.epa.kWhPer100Mi > 0;

  if (
    car.epa?.co2 === 0 &&
    mpge > 0 &&
    !hasEvRange &&
    !hasKwh &&
    ft !== 'electric' &&
    ft !== 'plug-in hybrid'
  ) {
    return true;
  }

  return false;
}

export function effectiveFuelType(car: CarSpecs): string {
  return isFuelCellVehicle(car) ? 'hydrogen' : car.engine.fuelType;
}

export function usesMpge(fuelType: string): boolean {
  return fuelType === 'electric' || fuelType === 'hydrogen';
}

export function formatFuelTypeLabel(fuelType: string): string {
  switch (fuelType) {
    case 'hydrogen':
      return 'Hydrogen Fuel Cell';
    case 'plug-in hybrid':
      return 'Plug-In Hybrid';
    case 'electric':
      return 'Electric';
    case 'gasoline':
      return 'Gasoline';
    case 'diesel':
      return 'Diesel';
    case 'hybrid':
      return 'Hybrid';
    default:
      return fuelType.charAt(0).toUpperCase() + fuelType.slice(1);
  }
}

/** Compact badge text for cards and pills. */
export function formatFuelBadge(fuelType: string): string {
  if (fuelType === 'hydrogen') return 'fuel cell';
  return fuelType;
}

export function formatPowertrainLabel(fuelType: string): string | null {
  if (fuelType === 'hydrogen') return 'Fuel Cell Electric Vehicle';
  if (fuelType === 'electric') return 'Battery Electric Vehicle';
  return null;
}

/**
 * EPA records cylinder count but not bank layout, so the database builder
 * inferred one. That inference holds for the counts with a single common
 * layout (I3/I4, V8/V10/V12) but not for these two: six cylinders are usually
 * a V6 rather than the "I6" it wrote, and five-cylinder engines are inline,
 * never the "V5" it wrote. For those we show the count and claim no layout.
 */
const GUESSED_LAYOUT_BY_CYLINDERS = new Map<number, string>([
  [5, 'V5'],
  [6, 'I6'],
]);

function isGuessedLayout(configuration: string, cylinders?: number): boolean {
  if (cylinders == null) return false;
  const guessed = GUESSED_LAYOUT_BY_CYLINDERS.get(cylinders);
  return guessed != null && configuration.trim().toUpperCase() === guessed;
}

/** Bank layout when it is genuinely known, otherwise the honest cylinder count. */
export function engineLayoutLabel(configuration?: string, cylinders?: number): string | null {
  if (configuration && !isGuessedLayout(configuration, cylinders)) {
    return configuration;
  }
  if (cylinders != null && cylinders > 0) return `${cylinders}-cyl`;
  return null;
}

export function formatEngineSystem(
  fuelType: string,
  displacement?: number | null,
  configuration?: string,
  cylinders?: number,
): string {
  if (fuelType === 'hydrogen') return 'Hydrogen Fuel Cell System';
  if (fuelType === 'electric') return 'Electric Motor';

  const parts: string[] = [];
  if (displacement != null && displacement > 0) parts.push(`${displacement}L`);
  const layout = engineLayoutLabel(configuration, cylinders);
  if (layout) parts.push(layout);
  return parts.join(' ') || 'Not on file';
}
