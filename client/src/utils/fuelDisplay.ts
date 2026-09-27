import type { CarSpecs } from '../types/car.types';

const FCEV_NAME_RE = /\b(fuel\s*cell|fcv|fcev|mirai|nexo)\b/i;

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
    case 'natural gas':
      return 'Natural Gas (CNG)';
    default:
      return fuelType.charAt(0).toUpperCase() + fuelType.slice(1);
  }
}

/** Compact badge text for cards and pills. */
export function formatFuelBadge(fuelType: string): string {
  if (fuelType === 'hydrogen') return 'fuel cell';
  return fuelType;
}

type FuelCar = { engine: Pick<CarSpecs['engine'], 'fuelType' | 'mildHybrid'> };

/**
 * The fuel, naming a mild hybrid: EPA files a 48 V mild hybrid (an S8, a Ram
 * eTorque) as a "Hybrid", but its motor never drives the car and it runs on
 * gasoline, so it is listed as gasoline and said to be a mild hybrid.
 */
export function formatCarFuelLabel(car: FuelCar): string {
  const label = formatFuelTypeLabel(car.engine.fuelType);
  return car.engine.mildHybrid ? `${label}, mild hybrid` : label;
}

/** Card and pill text: "gasoline mild hybrid". */
export function formatCarFuelBadge(car: FuelCar): string {
  const badge = formatFuelBadge(car.engine.fuelType);
  return car.engine.mildHybrid ? `${badge} mild hybrid` : badge;
}

export function formatPowertrainLabel(fuelType: string): string | null {
  if (fuelType === 'hydrogen') return 'Fuel Cell Electric Vehicle';
  if (fuelType === 'electric') return 'Battery Electric Vehicle';
  return null;
}

/**
 * The layout where the server knows it ("V6", "Flat-4", "W12": it follows the
 * engine family, as EPA records only a count), otherwise the cylinder count.
 */
export function engineLayoutLabel(configuration?: string, cylinders?: number): string | null {
  if (configuration) return configuration;
  if (cylinders != null && cylinders > 0) return `${cylinders}-cyl`;
  return null;
}

const ASPIRATION_LABELS: Record<NonNullable<CarSpecs['engine']['aspiration']>, string> = {
  turbocharged: 'Turbo',
  supercharged: 'Supercharged',
  'turbocharged and supercharged': 'Turbo + supercharged',
};

/** "Turbo", "Supercharged"; null for a naturally aspirated or electric car. */
export function aspirationLabel(aspiration?: CarSpecs['engine']['aspiration']): string | null {
  return aspiration ? ASPIRATION_LABELS[aspiration] : null;
}

export function formatEngineSystem(
  fuelType: string,
  displacement?: number | null,
  configuration?: string,
  cylinders?: number,
  aspiration?: CarSpecs['engine']['aspiration'],
): string {
  if (fuelType === 'hydrogen') return 'Hydrogen Fuel Cell System';
  if (fuelType === 'electric') return 'Electric Motor';

  const parts: string[] = [];
  if (displacement != null && displacement > 0) parts.push(`${displacement}L`);
  const layout = engineLayoutLabel(configuration, cylinders);
  if (layout) parts.push(layout);
  // "2.0L I4 Turbo": without it a Civic Type R read like the base 2.0L.
  const induction = aspirationLabel(aspiration);
  if (induction && parts.length) parts.push(induction);
  return parts.join(' ') || 'Not on file';
}
