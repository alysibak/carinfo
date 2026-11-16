/**
 * What a listing's asking price and odometer say against what is on file for
 * the car: our estimated value for the region, and the region's typical
 * yearly distance. Plain bands, no score; the figures are estimates.
 */
export interface ValueRange {
  low: number;
  high: number;
  mid: number;
}

export interface ListingVerdict {
  price?: {
    /** Asking price less the estimate's midpoint; positive when above. */
    diff: number;
    band: 'below' | 'within' | 'above';
    value: ValueRange;
  };
  km?: {
    perYear: number;
    typicalPerYear: number;
    band: 'low' | 'typical' | 'high';
  };
}

/** How far outside typical use a yearly distance must be to say so. */
const KM_BAND = 0.3;

/**
 * A model year's cars go on sale the autumn before, so a car is about a year
 * old at the end of its model year; never less than half a year, so a new
 * car's few hundred kilometres do not read as a high yearly distance.
 */
export function carAgeYears(year: number, now = new Date()): number {
  return Math.max(0.5, now.getFullYear() - year + (now.getMonth() + 1) / 12);
}

export function listingVerdict(input: {
  year: number;
  askingPrice?: number | null;
  odometerKm?: number | null;
  value?: ValueRange | null;
  annualKm: number;
  now?: Date;
}): ListingVerdict {
  const out: ListingVerdict = {};
  const { askingPrice, odometerKm, value } = input;
  if (askingPrice != null && askingPrice > 0 && value && value.high > 0) {
    out.price = {
      diff: Math.round(askingPrice - value.mid),
      band: askingPrice < value.low ? 'below' : askingPrice > value.high ? 'above' : 'within',
      value,
    };
  }
  if (odometerKm != null && odometerKm >= 0 && input.annualKm > 0) {
    const perYear = Math.round(odometerKm / carAgeYears(input.year, input.now));
    const ratio = perYear / input.annualKm;
    out.km = {
      perYear,
      typicalPerYear: input.annualKm,
      band: ratio < 1 - KM_BAND ? 'low' : ratio > 1 + KM_BAND ? 'high' : 'typical',
    };
  }
  return out;
}
