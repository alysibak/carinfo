import type { CarSpecs } from '../types/car.types';

/** Words EPA adds to a model name for the drive, body or powertrain, not the model. */
const CONFIG_WORD =
  /^(?:\d+-door|\d+dr|\d+wd|awd|fwd|rwd|4x4|4x2|ffv|hybrid|phev|plug-in|automatic|manual|cvt)$/i;

/** "toyota|rav4": the model a car is, whatever its drive or trim. */
export function modelFamily(car: Pick<CarSpecs, 'make' | 'model'>): string {
  const words = car.model
    .toLowerCase()
    .split(/[\s_/]+/)
    .filter(Boolean);
  const kept: string[] = [];
  for (const word of words) {
    if (CONFIG_WORD.test(word)) break;
    kept.push(word);
  }
  return `${car.make}|${(kept.length ? kept : words.slice(0, 1)).join(' ')}`.toLowerCase();
}
