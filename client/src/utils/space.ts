import type { CarSpecs } from '../types/car.types';

const LITRES_PER_CUBIC_FOOT = 28.3168;

/** EPA publishes interior volumes in whole cubic feet. */
export function litres(cubicFeet: number): number {
  return Math.round(cubicFeet * LITRES_PER_CUBIC_FOOT);
}

/** "425 L (15 cu ft)": litres first, with EPA's own figure beside it. */
export function formatVolume(cubicFeet: number): string {
  return `${litres(cubicFeet).toLocaleString('en-CA')} L (${cubicFeet} cu ft)`;
}

/**
 * What EPA's luggage volume measures for the body: a sedan's, coupe's or
 * convertible's trunk; for anything opening at the back, the space behind
 * the rearmost seats with every seat up (a Traverse's 23 cu ft is behind its
 * third row).
 */
export function luggageLabel(bodyStyle: CarSpecs['bodyStyle']): string {
  return bodyStyle === 'sedan' || bodyStyle === 'coupe' || bodyStyle === 'convertible'
    ? 'Trunk'
    : 'Cargo space, all seats up';
}
