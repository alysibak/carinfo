import type { CarSpecs } from '../types/car.types';
import { efficiencyOf, rangeKm } from './efficiency';
import { formatFuelBadge, usesMpge } from './fuelDisplay';
import { displayModelLabel } from './trimLabel';

export interface CarEdge {
  carId: string;
  /** Plain-English differentiator vs the rest of this set. */
  edge: string;
}

export interface DiffResult {
  /** Per-car edge (always one line when possible). */
  byCarId: Record<string, CarEdge>;
  /** Group-level axes of difference — how the set actually splits. */
  axes: string[];
}

type MetricKey = 'mpg' | 'price' | 'hp' | 'safety' | 'year' | 'range';

interface MetricDef {
  key: MetricKey;
  get: (car: CarSpecs) => number | null;
  higherIsBetter: boolean;
  /** Absolute delta that a non-expert would notice. */
  minAbsDelta: number;
  /** Relative delta (fraction) when useful. */
  minRelDelta?: number;
  labelBest: (car: CarSpecs, value: number, peers: string) => string;
  labelWorst?: (car: CarSpecs, value: number, peers: string) => string;
  axisLabel: (spread: string) => string;
}

function mpgUnit(car: CarSpecs): string {
  return usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
}

/**
 * Efficiency is compared on EPA's miles-per-gallon figure (the thresholds are
 * in it) but said in L/100 km or kWh/100 km, as Canadians read it. Litres
 * fall as miles-per-gallon rise, so a spread is re-ordered after converting.
 */
function fuelUse(car: CarSpecs, mpg: number): string {
  const eff = efficiencyOf({ ...car, fuelEconomy: { ...car.fuelEconomy, combined: mpg } });
  return eff ? eff.text.split(' ')[0] : String(Math.round(mpg));
}

function fuelUnit(car: CarSpecs): string {
  return efficiencyOf(car)?.unit ?? mpgUnit(car);
}

function fuelSpread(car: CarSpecs, values: number[]): string {
  const converted = values.map((v) => Number(fuelUse(car, v))).sort((a, b) => a - b);
  const lo = converted[0].toFixed(1);
  const hi = converted[converted.length - 1].toFixed(1);
  return lo === hi ? lo : `${lo}–${hi}`;
}

/** One efficiency unit across a set, or none: litres and kilowatt-hours do not compare. */
function sharedFuelUnit(set: CarSpecs[]): boolean {
  return new Set(set.map(fuelUnit)).size === 1;
}

function formatMoneyShort(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

const METRICS: MetricDef[] = [
  {
    key: 'mpg',
    get: (car) => car.fuelEconomy.combined ?? null,
    higherIsBetter: true,
    minAbsDelta: 2,
    minRelDelta: 0.06,
    labelBest: (car, value, peers) =>
      `Uses the least fuel here (${fuelUse(car, value)} ${fuelUnit(car)}${peers ? ` vs ${peers}` : ''})`,
    labelWorst: (car, value) => `Uses the most fuel here (${fuelUse(car, value)} ${fuelUnit(car)})`,
    axisLabel: (spread) => `Fuel use runs ${spread}`,
  },
  {
    key: 'hp',
    get: (car) => car.engine.horsepower ?? null,
    higherIsBetter: true,
    minAbsDelta: 25,
    minRelDelta: 0.12,
    labelBest: (_car, value, peers) =>
      `The most power here (${Math.round(value)} hp${peers ? ` vs ${peers}` : ''})`,
    labelWorst: (_car, value) => `The least power here (${Math.round(value)} hp)`,
    axisLabel: (spread) => `Power runs ${spread}`,
  },
  {
    key: 'safety',
    get: (car) => {
      const s = car.safetyRating?.overall;
      return s != null && s > 0 ? s : null;
    },
    higherIsBetter: true,
    minAbsDelta: 1,
    labelBest: (_car, value) => `The best NHTSA rating here (${value}/5)`,
    axisLabel: (spread) => `NHTSA ratings run ${spread}`,
  },
  {
    key: 'year',
    get: (car) => car.year,
    higherIsBetter: true,
    minAbsDelta: 2,
    labelBest: (car) => `The newest here (${car.year})`,
    labelWorst: (car) => `The oldest here (${car.year})`,
    axisLabel: (spread) => `Model years run ${spread}`,
  },
  {
    key: 'range',
    get: (car) =>
      car.engine.fuelType === 'electric' || car.engine.fuelType === 'plug-in hybrid'
        ? (car.epa?.rangeMiles ?? null)
        : null,
    higherIsBetter: true,
    minAbsDelta: 20,
    minRelDelta: 0.1,
    labelBest: (_car, value, peers) =>
      `The longest electric range (${rangeKm(value)} km${peers ? ` vs ${peers}` : ''})`,
    axisLabel: (spread) => `Electric range runs ${spread}`,
  },
  {
    key: 'price',
    get: (car) => car.price?.msrp ?? null,
    higherIsBetter: false,
    minAbsDelta: 1500,
    minRelDelta: 0.08,
    labelBest: (_car, value, peers) =>
      `Costs the least to buy (est. ${formatMoneyShort(value)}${peers ? ` vs ${peers}` : ''})`,
    labelWorst: (_car, value) => `Costs the most to buy (est. ${formatMoneyShort(value)})`,
    axisLabel: (spread) => `Estimated values run ${spread}`,
  },
];

function meaningfulSpread(values: number[], minAbs: number, minRel?: number): boolean {
  if (values.length < 2) return false;
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const abs = hi - lo;
  if (abs < minAbs) return false;
  if (minRel != null && lo > 0 && abs / lo < minRel && abs < minAbs * 2) {
    // Allow large absolute deltas even if relative is small (e.g. $3k on $40k).
    return abs >= minAbs * 1.5;
  }
  return true;
}

function peerRange(values: number[], exclude: number, format: (n: number) => string): string {
  const others = values.filter((v) => v !== exclude);
  if (others.length === 0) return '';
  const lo = Math.min(...others);
  const hi = Math.max(...others);
  if (lo === hi) return format(lo);
  return `${format(lo)}–${format(hi)}`;
}

function categoricalEdge(car: CarSpecs, set: CarSpecs[]): string | null {
  const fuels = new Set(set.map((c) => c.engine.fuelType));
  if (fuels.size > 1) {
    const sameFuel = set.filter((c) => c.engine.fuelType === car.engine.fuelType);
    if (sameFuel.length === 1) {
      return `The only ${formatFuelBadge(car.engine.fuelType).toLowerCase()} here`;
    }
  }

  const drives = new Set(set.map((c) => c.driveType).filter(Boolean));
  if (drives.size > 1 && car.driveType) {
    const awdish = car.driveType === 'AWD' || car.driveType === '4WD';
    const othersAwd = set.some(
      (c) => c.id !== car.id && (c.driveType === 'AWD' || c.driveType === '4WD'),
    );
    if (awdish && !othersAwd) return `The only ${car.driveType} here: better in snow`;
    if (!awdish && othersAwd && set.filter((c) => c.driveType === car.driveType).length === 1) {
      return `${car.driveType} rather than AWD: lighter, and usually uses less fuel`;
    }
  }

  const bodies = new Set(set.map((c) => c.bodyStyle).filter(Boolean));
  if (bodies.size > 1 && car.bodyStyle) {
    const alone = set.filter((c) => c.bodyStyle === car.bodyStyle).length === 1;
    if (alone) {
      const label =
        car.bodyStyle === 'suv' ? 'SUV' : car.bodyStyle === 'truck' ? 'pickup' : car.bodyStyle;
      return `The only ${label} here`;
    }
  }

  return null;
}

function pickMetricEdge(car: CarSpecs, set: CarSpecs[]): string | null {
  const candidates: { score: number; text: string; estimate: boolean }[] = [];

  for (const metric of METRICS) {
    if (metric.key === 'mpg' && !sharedFuelUnit(set)) continue;
    const scored = set
      .map((c) => ({ car: c, value: metric.get(c) }))
      .filter((x): x is { car: CarSpecs; value: number } => x.value != null);
    if (scored.length < 2) continue;

    const values = scored.map((x) => x.value);
    if (!meaningfulSpread(values, metric.minAbsDelta, metric.minRelDelta)) continue;

    const mine = scored.find((x) => x.car.id === car.id);
    if (!mine) continue;

    const best = metric.higherIsBetter ? Math.max(...values) : Math.min(...values);
    const worst = metric.higherIsBetter ? Math.min(...values) : Math.max(...values);
    const uniqueBest = values.filter((v) => v === best).length === 1;
    const uniqueWorst = values.filter((v) => v === worst).length === 1;

    const fmt =
      metric.key === 'price'
        ? formatMoneyShort
        : metric.key === 'hp'
          ? (n: number) => `${Math.round(n)}`
          : metric.key === 'range'
            ? (n: number) => `${rangeKm(n)}`
            : (n: number) => String(n);

    const estimate = metric.key === 'price';
    if (mine.value === best && uniqueBest) {
      const peers =
        metric.key === 'mpg'
          ? fuelSpread(
              car,
              values.filter((v) => v !== mine.value),
            )
          : peerRange(values, mine.value, fmt);
      candidates.push({
        score: Math.abs(best - worst) / (metric.minAbsDelta || 1),
        text: metric.labelBest(car, mine.value, peers),
        estimate,
      });
    } else if (mine.value === worst && uniqueWorst && metric.labelWorst && set.length <= 4) {
      candidates.push({
        score: (Math.abs(best - worst) / (metric.minAbsDelta || 1)) * 0.55,
        text: metric.labelWorst(car, mine.value, ''),
        estimate,
      });
    }
  }

  // An estimated price speaks only when no measured figure sets the car apart.
  candidates.sort((a, b) => Number(a.estimate) - Number(b.estimate) || b.score - a.score);
  return candidates[0]?.text ?? null;
}

function buildAxes(set: CarSpecs[]): string[] {
  const axes: string[] = [];

  let priceAxis: string | null = null;
  for (const metric of METRICS) {
    if (metric.key === 'mpg' && !sharedFuelUnit(set)) continue;
    const scored = set
      .map((c) => ({ car: c, value: metric.get(c) }))
      .filter((x): x is { car: CarSpecs; value: number } => x.value != null);
    if (scored.length < 2) continue;
    const values = scored.map((x) => x.value);
    if (!meaningfulSpread(values, metric.minAbsDelta, metric.minRelDelta)) continue;

    if (metric.key === 'price') {
      priceAxis = metric.axisLabel(
        `${formatMoneyShort(Math.min(...values))}–${formatMoneyShort(Math.max(...values))}`,
      );
      continue;
    }

    if (metric.key === 'mpg') {
      axes.push(metric.axisLabel(`${fuelSpread(set[0], values)} ${fuelUnit(set[0])}`));
      continue;
    }

    const fmt =
      metric.key === 'hp'
        ? (n: number) => `${Math.round(n)} hp`
        : metric.key === 'safety'
          ? (n: number) => `${n}/5`
          : metric.key === 'range'
            ? (n: number) => `${rangeKm(n)} km`
            : (n: number) => String(n);

    const lo = Math.min(...values);
    const hi = Math.max(...values);
    axes.push(metric.axisLabel(`${fmt(lo)}–${fmt(hi)}`));
  }

  const fuels = [...new Set(set.map((c) => formatFuelBadge(c.engine.fuelType)))];
  if (fuels.length > 1) axes.unshift(`Different powertrains: ${fuels.join(', ')}`);

  const bodies = [
    ...new Set(
      set
        .map((c) =>
          c.bodyStyle === 'suv' ? 'SUV' : c.bodyStyle === 'truck' ? 'pickup' : c.bodyStyle,
        )
        .filter(Boolean),
    ),
  ];
  if (bodies.length > 1) axes.push(`Different shapes: ${bodies.join(', ')}`);
  // The records first; the estimated values only if there is room.
  if (priceAxis) axes.push(priceAxis);

  return axes.slice(0, 3);
}

function closeCallFallback(car: CarSpecs, set: CarSpecs[]): string {
  // In a long shortlist nearly every car is "close to" two others: a line
  // that says nothing, so it is left out there.
  if (set.length > 3) return '';
  const similarNames = set
    .filter((c) => c.id !== car.id)
    .slice(0, 2)
    .map((c) => `${c.make} ${displayModelLabel(c)}`);
  return similarNames.length > 0
    ? `Close to the ${similarNames.join(' and the ')} on every figure on file`
    : 'Close to the others on every figure on file';
}

/**
 * Explain how cars in a shortlist actually differ so a non-expert can choose.
 * Uses only on-file specs; skips tiny deltas that feel like noise.
 */
export function differentiateCars(cars: CarSpecs[]): DiffResult {
  const set = cars.filter(Boolean);
  const byCarId: Record<string, CarEdge> = {};
  if (set.length === 0) return { byCarId, axes: [] };
  if (set.length === 1) {
    byCarId[set[0].id] = {
      carId: set[0].id,
      edge: 'Your shortlist starts here — add another car to see trade-offs',
    };
    return { byCarId, axes: [] };
  }

  for (const car of set) {
    const edge =
      categoricalEdge(car, set) ?? pickMetricEdge(car, set) ?? closeCallFallback(car, set);
    byCarId[car.id] = { carId: car.id, edge };
  }

  return { byCarId, axes: buildAxes(set) };
}

const POWERTRAIN: Record<string, string> = {
  gasoline: 'gas',
  diesel: 'diesel',
  hybrid: 'hybrid',
  'plug-in hybrid': 'plug-in hybrid',
  electric: 'electric',
  hydrogen: 'fuel cell',
  'natural gas': 'natural gas',
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function bodyNoun(style: string): string {
  const label = style === 'suv' ? 'SUV' : style === 'truck' ? 'pickup' : style;
  return `${/^[aeiou]|^SUV/i.test(label) ? 'an' : 'a'} ${label}`;
}

const isAwd = (drive?: string) => drive === 'AWD' || drive === '4WD';
const isManual = (car: CarSpecs) => car.transmission?.type === 'manual';

/** What makes the alternative a different kind of car: powertrain, drive, gearbox, body. */
function kindDifference(anchor: CarSpecs, alt: CarSpecs): string | null {
  const fuel = alt.engine.fuelType;
  if (fuel !== anchor.engine.fuelType) {
    const text = `${capitalize(POWERTRAIN[fuel] ?? fuel)}, not ${POWERTRAIN[anchor.engine.fuelType] ?? anchor.engine.fuelType}`;
    const a = alt.fuelEconomy.combined;
    const b = anchor.fuelEconomy.combined;
    return a && b && fuelUnit(alt) === fuelUnit(anchor)
      ? `${text} (${fuelUse(alt, a)} vs ${fuelUse(anchor, b)} ${fuelUnit(alt)})`
      : text;
  }
  if (alt.driveType && anchor.driveType && alt.driveType !== anchor.driveType) {
    if (isAwd(alt.driveType) && !isAwd(anchor.driveType)) {
      return `${alt.driveType}, which this car lacks: better in snow`;
    }
    if (!isAwd(alt.driveType) && isAwd(anchor.driveType)) {
      return `${alt.driveType}, not ${anchor.driveType}: usually lighter and more efficient`;
    }
    if (!isAwd(alt.driveType) && !isAwd(anchor.driveType)) {
      return `${alt.driveType}, not ${anchor.driveType}`;
    }
  }
  if (isManual(alt) !== isManual(anchor) && alt.transmission && anchor.transmission) {
    return isManual(alt) ? 'Manual, not automatic' : 'Automatic, not manual';
  }
  if (alt.bodyStyle && anchor.bodyStyle && alt.bodyStyle !== anchor.bodyStyle) {
    return capitalize(`${bodyNoun(alt.bodyStyle)}, not ${bodyNoun(anchor.bodyStyle)}`);
  }
  return null;
}

interface PairMetric {
  get: (car: CarSpecs) => number | null;
  minAbs: number;
  minRel: number;
  higherIsBetter: boolean;
  text: (better: boolean, alt: number, anchor: number, car: CarSpecs) => string;
}

const PRICE_METRIC: PairMetric = {
  get: (car) => car.price?.msrp ?? null,
  minAbs: 1500,
  minRel: 0.08,
  higherIsBetter: false,
  text: (better, a, b) =>
    `${better ? 'Costs less' : 'Costs more'} (est. ${formatMoneyShort(a)} vs ${formatMoneyShort(b)})`,
};

const PAIR_METRICS: PairMetric[] = [
  {
    get: (car) => car.fuelEconomy.combined ?? null,
    minAbs: 2,
    minRel: 0.06,
    higherIsBetter: true,
    text: (better, a, b, car) =>
      `${better ? 'Uses less fuel' : 'Uses more fuel'} (${fuelUse(car, a)} vs ${fuelUse(car, b)} ${fuelUnit(car)})`,
  },
  PRICE_METRIC,
  {
    get: (car) => car.engine.horsepower ?? null,
    minAbs: 25,
    minRel: 0.12,
    higherIsBetter: true,
    text: (better, a, b) =>
      `${better ? 'More power' : 'Less power'} (${Math.round(a)} vs ${Math.round(b)} hp)`,
  },
  {
    get: (car) => {
      const s = car.safetyRating?.overall;
      return s != null && s > 0 ? s : null;
    },
    minAbs: 1,
    minRel: 0,
    higherIsBetter: true,
    text: (better, a, b) => `${better ? 'Better' : 'Lower'} NHTSA rating (${a}/5 vs ${b}/5)`,
  },
  {
    get: (car) =>
      car.engine.fuelType === 'electric' || car.engine.fuelType === 'plug-in hybrid'
        ? (car.epa?.rangeMiles ?? null)
        : null,
    minAbs: 20,
    minRel: 0.1,
    higherIsBetter: true,
    text: (better, a, b) =>
      `${better ? 'Longer' : 'Shorter'} electric range (${rangeKm(a)} vs ${rangeKm(b)} km)`,
  },
  {
    get: (car) => car.year,
    minAbs: 2,
    minRel: 0,
    higherIsBetter: true,
    text: (better, a, b) => `${better ? 'Newer' : 'Older'} (${a} vs ${b})`,
  },
];

/**
 * The biggest measured difference worth a sentence, favouring the
 * alternative's strengths. The estimated price speaks only when no measured
 * figure differs enough.
 */
function metricDifference(anchor: CarSpecs, alt: CarSpecs, skipMpg: boolean): string | null {
  let best: { score: number; text: string } | null = null;
  let priceText: string | null = null;
  for (const metric of PAIR_METRICS) {
    if (skipMpg && metric === PAIR_METRICS[0]) continue;
    const a = metric.get(alt);
    const b = metric.get(anchor);
    if (a == null || b == null) continue;
    // Litres and kilowatt-hours do not compare.
    if (metric === PAIR_METRICS[0] && fuelUnit(alt) !== fuelUnit(anchor)) continue;
    const delta = Math.abs(a - b);
    if (delta < metric.minAbs || (b > 0 && delta / b < metric.minRel)) continue;
    const better = metric.higherIsBetter ? a > b : a < b;
    // Relative to each threshold, so 121 hp of 301 does not outshout 6 MPG of 26.
    const size = metric.minRel > 0 && b > 0 ? delta / b / metric.minRel : delta / metric.minAbs;
    if (metric === PRICE_METRIC) {
      priceText = metric.text(better, a, b, alt);
      continue;
    }
    const score = size * (better ? 1.25 : 1);
    if (!best || score > best.score) best = { score, text: metric.text(better, a, b, alt) };
  }
  return best?.text ?? priceText;
}

/** No difference worth a sentence: the near-equal figures, so the note still says something. */
function muchTheSame(anchor: CarSpecs, alt: CarSpecs): string {
  const figures: string[] = [];
  const a = alt.fuelEconomy.combined;
  const b = anchor.fuelEconomy.combined;
  if (a && b && fuelUnit(alt) === fuelUnit(anchor)) {
    figures.push(`${fuelUse(alt, a)} vs ${fuelUse(anchor, b)} ${fuelUnit(alt)}`);
  }
  const hpA = alt.engine.horsepower;
  const hpB = anchor.engine.horsepower;
  if (hpA && hpB) figures.push(`${Math.round(hpA)} vs ${Math.round(hpB)} hp`);
  return figures.length
    ? `Much the same on paper (${figures.join(', ')})`
    : 'Close to this car on every spec on file';
}

/**
 * How each alternative differs from the car you're viewing, in a line: what
 * kind of car it is, then its largest measured difference. The notes used to
 * be the shortlist wording with "here" swapped for "than this car", which
 * read "Best efficiency than this car" and "Only AWD than this car".
 */
export function differentiateVsAnchor(
  anchor: CarSpecs,
  others: CarSpecs[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const other of others) {
    const kind = kindDifference(anchor, other);
    // "Hybrid, not gas (4.5 vs 9.0 L/100 km)" has said the fuel use already.
    const metric = metricDifference(anchor, other, !!kind && /\/100 km\)$/.test(kind));
    const parts = [kind, metric].filter((part): part is string => !!part);
    out[other.id] = parts.length ? parts.join(' · ') : muchTheSame(anchor, other);
  }
  return out;
}
