import type { ModelYearSummary, TheftRank } from '../types/car.types.js';
import { ordinal, theftPlace } from './theft.js';

const KM_PER_MILE = 1.609344;

export interface VsSide {
  /** "Toyota RAV4" */
  label: string;
  year: number;
  summary: ModelYearSummary;
  /** Its place on Équité's list of the most stolen, when it has one. */
  theft?: TheftRank;
}

/** Within 5%: too close to call either way, as Compare's "best" marks. */
const close = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) < 0.05;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * How two models differ, in sentences a search result can show: fuel or
 * range, NHTSA's stars, recalls in Canada and theft, each from the model
 * year's figures (the best of its versions). Nothing is said where a figure
 * is missing on either side. English: the server renders it, and the app
 * gives the same words to search engines.
 */
export function vsDifferences([a, b]: [VsSide, VsSide]): string[] {
  const out: string[] = [];
  const sa = a.summary;
  const sb = b.summary;

  const burnsA = sa.combinedMpg && sa.combinedMpg > 0 ? 235.215 / sa.combinedMpg : null;
  const burnsB = sb.combinedMpg && sb.combinedMpg > 0 ? 235.215 / sb.combinedMpg : null;
  const rangeA = sa.rangeMiles ? Math.round(sa.rangeMiles * KM_PER_MILE) : null;
  const rangeB = sb.rangeMiles ? Math.round(sb.rangeMiles * KM_PER_MILE) : null;
  if (burnsA && burnsB) {
    const [thrifty, other] = burnsA <= burnsB ? [a, b] : [b, a];
    const [low, high] = [Math.min(burnsA, burnsB), Math.max(burnsA, burnsB)].map((l) =>
      l.toFixed(1),
    );
    out.push(
      close(burnsA, burnsB)
        ? `Both use about the same fuel: from ${low} and ${high} L/100 km.`
        : `The ${thrifty.label} uses less fuel: from ${low} L/100 km, against ${high} for the ${other.label}.`,
    );
  } else if (rangeA && rangeB) {
    const [farther, other] = rangeA >= rangeB ? [a, b] : [b, a];
    const [high, low] = [Math.max(rangeA, rangeB), Math.min(rangeA, rangeB)];
    out.push(
      close(rangeA, rangeB)
        ? `Both go about as far on a charge: up to ${high} and ${low} km.`
        : `The ${farther.label} goes farther on a charge: up to ${high} km, against ${low} for the ${other.label}.`,
    );
  } else if ((rangeA && !burnsA && burnsB) || (rangeB && !burnsB && burnsA)) {
    const [ev, gas] = rangeA && !burnsA ? [a, b] : [b, a];
    out.push(`The ${ev.label} is electric; the ${gas.label} burns fuel.`);
  }

  const [starsA, starsB] = [sa.safetyStars, sb.safetyStars];
  if (starsA && starsB) {
    out.push(
      starsA === starsB
        ? `NHTSA gives both ${starsA} stars overall.`
        : `NHTSA gives the ${a.label} ${starsA} stars overall and the ${b.label} ${starsB}.`,
    );
  } else if (starsA || starsB) {
    const [rated, stars] = starsA ? [a, starsA] : [b, starsB!];
    out.push(`Of the two, only the ${rated.label} has an NHTSA overall rating: ${stars} stars.`);
  }

  if (sa.recalls != null && sb.recalls != null) {
    out.push(
      sa.recalls === 0 && sb.recalls === 0
        ? `No recalls in Canada so far for either ${a.year === b.year ? `${a.year} model` : 'model year'}.`
        : a.year === b.year
          ? `Recalls in Canada for the ${a.year} models: ${plural(sa.recalls, 'recall', 'recalls')} for the ${a.label}, ${sb.recalls} for the ${b.label}.`
          : `Recalls in Canada: ${plural(sa.recalls, 'recall', 'recalls')} for the ${a.year} ${a.label}, ${sb.recalls} for the ${b.year} ${b.label}.`,
    );
  }

  // Équité's list, in our names for the models.
  const [ta, tb] = [a.theft, b.theft];
  if (ta && tb && ta.year === tb.year) {
    out.push(
      `On Équité Association’s ${ta.year} count of Canada’s most stolen vehicles, the ${a.label} was ${ordinal(ta.rank)} and the ${b.label} ${ordinal(tb.rank)}.`,
    );
  } else {
    for (const side of [a, b]) {
      if (side.theft) {
        out.push(`The ${side.label} was ${theftPlace(side.theft)}, by Équité Association’s count.`);
      }
    }
  }
  return out;
}

/** The page's description: the two differences that lead, then what else it holds. */
export function vsDescription(sides: [VsSide, VsSide], fallback: string): string {
  const lead = vsDifferences(sides).slice(0, 2);
  return lead.length
    ? `${lead.join(' ')} Complaints and running costs side by side, from public records.`
    : fallback;
}
