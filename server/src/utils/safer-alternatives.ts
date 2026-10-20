import type { Car, SaferAlternative } from '../types/car.types.js';

/**
 * Among the cars shopped against a car (utils/similar-vehicles.ts), those
 * NHTSA's records put ahead on safety: more overall stars, or as many with
 * forward collision warning standard where the car has it only as an option
 * or not listed. Only a car NHTSA rated can be said to have safer rivals.
 */
export function saferAlternatives(
  anchor: Car,
  rivals: Car[],
  label: (car: Car) => string,
  limit = 3,
): SaferAlternative[] {
  const stars = anchor.safetyRating?.overall;
  if (!stars) return [];
  const anchorWarns = anchor.safetyTech?.fcw === 'standard';
  const out: SaferAlternative[] = [];
  for (const car of rivals) {
    const theirs = car.safetyRating?.overall;
    if (!theirs) continue;
    let reason: string | null = null;
    if (theirs > stars) reason = `${theirs}/5 overall (this one ${stars}/5)`;
    else if (theirs === stars && !anchorWarns && car.safetyTech?.fcw === 'standard') {
      reason = `${theirs}/5 overall and forward collision warning standard`;
    }
    if (reason) out.push({ id: car.id, label: label(car), reason });
    if (out.length >= limit) break;
  }
  return out;
}
