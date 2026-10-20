import type { VehicleSize } from '../types/car.types';

/** "4.59 m", "5.32–5.89 m" across the versions measured. */
export function formatMetres([low, high]: [number, number]): string {
  const m = (cm: number) => (cm / 100).toFixed(2);
  return low === high ? `${m(low)} m` : `${m(low)}–${m(high)} m`;
}

/** "1,502 kg", "1,502–1,580 kg". */
export function formatKg([low, high]: [number, number]): string {
  const kg = (n: number) => n.toLocaleString('en-CA');
  return low === high ? `${kg(low)} kg` : `${kg(low)}–${kg(high)} kg`;
}

export interface FitCheck {
  fits: boolean;
  /** Centimetres to spare (negative: too long or too wide), for the longest and widest version. */
  spareLengthCm: number;
  spareWidthCm: number;
}

/**
 * Whether the car, its longest and widest version measured, fits a space the
 * shopper measured. Transport Canada's width is the body's: mirrors and open
 * doors need more, which the result leaves to the shopper.
 */
export function fitCheck(size: VehicleSize, spaceLengthCm: number, spaceWidthCm: number): FitCheck {
  const spareLengthCm = Math.round(spaceLengthCm - size.lengthCm[1]);
  const spareWidthCm = Math.round(spaceWidthCm - size.widthCm[1]);
  return { fits: spareLengthCm >= 0 && spareWidthCm >= 0, spareLengthCm, spareWidthCm };
}
