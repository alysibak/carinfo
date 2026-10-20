import type { TheftRank } from '../types/car.types.js';

/**
 * How a model's place on Équité Association's list of Canada's most stolen
 * vehicles is said, on the car and model pages and in the HTML crawlers get.
 */

/** 1 → "1st", 12 → "12th", 23 → "23rd". */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** "the most stolen vehicle in Canada in 2024", "the 3rd most stolen vehicle in Canada in 2024". */
export function theftPlace(theft: TheftRank): string {
  return `the ${theft.rank === 1 ? '' : `${ordinal(theft.rank)} `}most stolen vehicle in Canada in ${theft.year}`;
}

/** "The Toyota RAV4 was the most stolen vehicle in Canada in 2024, by Équité Association's count." */
export function theftSentence(theft: TheftRank): string {
  return `The ${theft.model} was ${theftPlace(theft)}, by Équité Association’s count.`;
}
