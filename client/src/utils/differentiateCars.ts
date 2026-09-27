import type { CarSpecs } from '../types/car.types';
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

function roundMpg(n: number): number {
  return Math.round(n);
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
      `Best efficiency here (${roundMpg(value)} ${mpgUnit(car)}${peers ? ` vs ${peers}` : ''})`,
    labelWorst: (car, value) =>
      `Thirstiest in this set (${roundMpg(value)} ${mpgUnit(car)} combined)`,
    axisLabel: (spread) => `Efficiency spreads ${spread}`,
  },
  {
    key: 'price',
    get: (car) => car.price?.msrp ?? null,
    higherIsBetter: false,
    minAbsDelta: 1500,
    minRelDelta: 0.08,
    labelBest: (_car, value, peers) =>
      `Lowest estimated value (${formatMoneyShort(value)}${peers ? ` vs ${peers}` : ''})`,
    labelWorst: (_car, value) => `Highest estimated value (${formatMoneyShort(value)})`,
    axisLabel: (spread) => `Estimated value spreads ${spread}`,
  },
  {
    key: 'hp',
    get: (car) => car.engine.horsepower ?? null,
    higherIsBetter: true,
    minAbsDelta: 25,
    minRelDelta: 0.12,
    labelBest: (_car, value, peers) =>
      `Most power here (${Math.round(value)} hp${peers ? ` vs ${peers}` : ''})`,
    labelWorst: (_car, value) => `Least power here (${Math.round(value)} hp)`,
    axisLabel: (spread) => `Power spreads ${spread}`,
  },
  {
    key: 'safety',
    get: (car) => {
      const s = car.safetyRating?.overall;
      return s != null && s > 0 ? s : null;
    },
    higherIsBetter: true,
    minAbsDelta: 1,
    labelBest: (_car, value) => `Higher NHTSA rating (${value}/5)`,
    axisLabel: (spread) => `NHTSA ratings ${spread}`,
  },
  {
    key: 'year',
    get: (car) => car.year,
    higherIsBetter: true,
    minAbsDelta: 2,
    labelBest: (car) => `Newest here (${car.year})`,
    labelWorst: (car) => `Oldest here (${car.year})`,
    axisLabel: (spread) => `Model years ${spread}`,
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
      `Longest electric range (${Math.round(value)} mi${peers ? ` vs ${peers}` : ''})`,
    axisLabel: (spread) => `Electric range spreads ${spread}`,
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
      return `Only ${formatFuelBadge(car.engine.fuelType).toLowerCase()} in this set`;
    }
  }

  const drives = new Set(set.map((c) => c.driveType).filter(Boolean));
  if (drives.size > 1 && car.driveType) {
    const awdish = car.driveType === 'AWD' || car.driveType === '4WD';
    const othersAwd = set.some(
      (c) => c.id !== car.id && (c.driveType === 'AWD' || c.driveType === '4WD'),
    );
    if (awdish && !othersAwd)
      return `Only ${car.driveType} here — better for snow / light off-road`;
    if (!awdish && othersAwd && set.filter((c) => c.driveType === car.driveType).length === 1) {
      return `${car.driveType} — usually simpler and more efficient than AWD`;
    }
  }

  const bodies = new Set(set.map((c) => c.bodyStyle).filter(Boolean));
  if (bodies.size > 1 && car.bodyStyle) {
    const alone = set.filter((c) => c.bodyStyle === car.bodyStyle).length === 1;
    if (alone) {
      const label = car.bodyStyle === 'suv' ? 'SUV' : car.bodyStyle;
      return `Different shape — the ${label} in this set`;
    }
  }

  return null;
}

function pickMetricEdge(car: CarSpecs, set: CarSpecs[]): string | null {
  const candidates: { score: number; text: string }[] = [];

  for (const metric of METRICS) {
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
      metric.key === 'mpg'
        ? (n: number) => String(roundMpg(n))
        : metric.key === 'price'
          ? formatMoneyShort
          : metric.key === 'hp'
            ? (n: number) => `${Math.round(n)}`
            : metric.key === 'range'
              ? (n: number) => `${Math.round(n)}`
              : (n: number) => String(n);

    if (mine.value === best && uniqueBest) {
      const peers = peerRange(values, mine.value, fmt);
      candidates.push({
        score: Math.abs(best - worst) / (metric.minAbsDelta || 1),
        text: metric.labelBest(car, mine.value, peers),
      });
    } else if (mine.value === worst && uniqueWorst && metric.labelWorst && set.length <= 4) {
      candidates.push({
        score: (Math.abs(best - worst) / (metric.minAbsDelta || 1)) * 0.55,
        text: metric.labelWorst(car, mine.value, ''),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.text ?? null;
}

function buildAxes(set: CarSpecs[]): string[] {
  const axes: string[] = [];

  for (const metric of METRICS) {
    const scored = set
      .map((c) => ({ car: c, value: metric.get(c) }))
      .filter((x): x is { car: CarSpecs; value: number } => x.value != null);
    if (scored.length < 2) continue;
    const values = scored.map((x) => x.value);
    if (!meaningfulSpread(values, metric.minAbsDelta, metric.minRelDelta)) continue;

    const fmt =
      metric.key === 'mpg'
        ? (n: number) => `${roundMpg(n)}`
        : metric.key === 'price'
          ? formatMoneyShort
          : metric.key === 'hp'
            ? (n: number) => `${Math.round(n)} hp`
            : metric.key === 'safety'
              ? (n: number) => `${n}/5`
              : metric.key === 'range'
                ? (n: number) => `${Math.round(n)} mi`
                : (n: number) => String(n);

    const lo = Math.min(...values);
    const hi = Math.max(...values);
    axes.push(metric.axisLabel(`${fmt(lo)}–${fmt(hi)}`));
  }

  const fuels = [...new Set(set.map((c) => formatFuelBadge(c.engine.fuelType)))];
  if (fuels.length > 1) axes.unshift(`Powertrains differ: ${fuels.join(' · ')}`);

  const bodies = [...new Set(set.map((c) => c.bodyStyle).filter(Boolean))];
  if (bodies.length > 1) axes.push(`Body styles: ${bodies.join(', ')}`);

  return axes.slice(0, 3);
}

function closeCallFallback(car: CarSpecs, set: CarSpecs[]): string {
  const parts: string[] = [];
  if (car.bodyStyle) parts.push(car.bodyStyle);
  if (car.driveType) parts.push(car.driveType);
  parts.push(formatFuelBadge(car.engine.fuelType));
  const mpg = car.fuelEconomy.combined;
  if (mpg) parts.push(`${roundMpg(mpg)} ${mpgUnit(car)}`);

  const similarNames = set
    .filter((c) => c.id !== car.id)
    .slice(0, 2)
    .map((c) => `${c.make} ${displayModelLabel(c)}`);

  if (similarNames.length > 0) {
    return `Close to ${similarNames.join(' / ')} — compare ${parts.slice(0, 3).join(', ')}`;
  }
  return `Compare on ${parts.slice(0, 3).join(', ')}`;
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
    return a && b && mpgUnit(alt) === mpgUnit(anchor)
      ? `${text} (${roundMpg(a)} vs ${roundMpg(b)} ${mpgUnit(alt)})`
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

const PAIR_METRICS: PairMetric[] = [
  {
    get: (car) => car.fuelEconomy.combined ?? null,
    minAbs: 2,
    minRel: 0.06,
    higherIsBetter: true,
    text: (better, a, b, car) =>
      `${better ? 'Better fuel economy' : 'Uses more fuel'} (${roundMpg(a)} vs ${roundMpg(b)} ${mpgUnit(car)})`,
  },
  {
    get: (car) => car.price?.msrp ?? null,
    minAbs: 1500,
    minRel: 0.08,
    higherIsBetter: false,
    text: (better, a, b) =>
      `${better ? 'Costs less' : 'Costs more'} (est. ${formatMoneyShort(a)} vs ${formatMoneyShort(b)})`,
  },
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
      `${better ? 'Longer' : 'Shorter'} electric range (${Math.round(a)} vs ${Math.round(b)} mi)`,
  },
  {
    get: (car) => car.year,
    minAbs: 2,
    minRel: 0,
    higherIsBetter: true,
    text: (better, a, b) => `${better ? 'Newer' : 'Older'} (${a} vs ${b})`,
  },
];

/** The biggest measured difference worth a sentence, favouring the alternative's strengths. */
function metricDifference(anchor: CarSpecs, alt: CarSpecs, skipMpg: boolean): string | null {
  let best: { score: number; text: string } | null = null;
  for (const metric of PAIR_METRICS) {
    if (skipMpg && metric === PAIR_METRICS[0]) continue;
    const a = metric.get(alt);
    const b = metric.get(anchor);
    if (a == null || b == null) continue;
    // MPG and MPGe do not compare.
    if (metric === PAIR_METRICS[0] && mpgUnit(alt) !== mpgUnit(anchor)) continue;
    const delta = Math.abs(a - b);
    if (delta < metric.minAbs || (b > 0 && delta / b < metric.minRel)) continue;
    const better = metric.higherIsBetter ? a > b : a < b;
    // Relative to each threshold, so 121 hp of 301 does not outshout 6 MPG of 26.
    const size = metric.minRel > 0 && b > 0 ? delta / b / metric.minRel : delta / metric.minAbs;
    const score = size * (better ? 1.25 : 1);
    if (!best || score > best.score) best = { score, text: metric.text(better, a, b, alt) };
  }
  return best?.text ?? null;
}

/** No difference worth a sentence: the near-equal figures, so the note still says something. */
function muchTheSame(anchor: CarSpecs, alt: CarSpecs): string {
  const figures: string[] = [];
  const a = alt.fuelEconomy.combined;
  const b = anchor.fuelEconomy.combined;
  if (a && b && mpgUnit(alt) === mpgUnit(anchor)) {
    figures.push(`${roundMpg(a)} vs ${roundMpg(b)} ${mpgUnit(alt)}`);
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
    // "Hybrid, not gas (52 vs 26 MPG)" has said the fuel economy already.
    const metric = metricDifference(anchor, other, !!kind && / MPGe?\)$/.test(kind));
    const parts = [kind, metric].filter((part): part is string => !!part);
    out[other.id] = parts.length ? parts.join(' · ') : muchTheSame(anchor, other);
  }
  return out;
}
