import type { CarSpecs } from '../types/car.types';
import { t } from '../i18n';
import { efficiencyOf, rangeKm } from './efficiency';
import { formatFuelBadge, usesMpge } from './fuelDisplay';
import { litres } from './space';
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
      peers
        ? t('Uses the least fuel here ({use} vs {peers})', {
            use: `${fuelUse(car, value)} ${fuelUnit(car)}`,
            peers,
          })
        : t('Uses the least fuel here ({use})', {
            use: `${fuelUse(car, value)} ${fuelUnit(car)}`,
          }),
    labelWorst: (car, value) =>
      t('Uses the most fuel here ({use})', {
        use: `${fuelUse(car, value)} ${fuelUnit(car)}`,
      }),
    axisLabel: (spread) => t('Fuel use runs {spread}', { spread }),
  },
  {
    key: 'hp',
    get: (car) => car.engine.horsepower ?? null,
    higherIsBetter: true,
    minAbsDelta: 25,
    minRelDelta: 0.12,
    labelBest: (_car, value, peers) =>
      peers
        ? t('The most power here ({hp} hp vs {peers})', {
            hp: Math.round(value),
            peers,
          })
        : t('The most power here ({hp} hp)', { hp: Math.round(value) }),
    labelWorst: (_car, value) => t('The least power here ({hp} hp)', { hp: Math.round(value) }),
    axisLabel: (spread) => t('Power runs {spread}', { spread }),
  },
  {
    key: 'safety',
    get: (car) => {
      const s = car.safetyRating?.overall;
      return s != null && s > 0 ? s : null;
    },
    higherIsBetter: true,
    minAbsDelta: 1,
    labelBest: (_car, value) => t('The best NHTSA rating here ({rating}/5)', { rating: value }),
    axisLabel: (spread) => t('NHTSA ratings run {spread}', { spread }),
  },
  {
    key: 'year',
    get: (car) => car.year,
    higherIsBetter: true,
    minAbsDelta: 2,
    labelBest: (car) => t('The newest here ({year})', { year: car.year }),
    labelWorst: (car) => t('The oldest here ({year})', { year: car.year }),
    axisLabel: (spread) => t('Model years run {spread}', { spread }),
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
      peers
        ? t('The longest electric range ({km} km vs {peers})', {
            km: rangeKm(value),
            peers,
          })
        : t('The longest electric range ({km} km)', { km: rangeKm(value) }),
    axisLabel: (spread) => t('Electric range runs {spread}', { spread }),
  },
  {
    key: 'price',
    get: (car) => car.price?.msrp ?? null,
    higherIsBetter: false,
    minAbsDelta: 1500,
    minRelDelta: 0.08,
    labelBest: (_car, value, peers) =>
      peers
        ? t('Costs the least to buy (est. {price} vs {peers})', {
            price: formatMoneyShort(value),
            peers,
          })
        : t('Costs the least to buy (est. {price})', { price: formatMoneyShort(value) }),
    labelWorst: (_car, value) =>
      t('Costs the most to buy (est. {price})', { price: formatMoneyShort(value) }),
    axisLabel: (spread) => t('Estimated values run {spread}', { spread }),
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
      return t('The only {fuel} here', {
        fuel: formatFuelBadge(car.engine.fuelType).toLowerCase(),
      });
    }
  }

  const drives = new Set(set.map((c) => c.driveType).filter(Boolean));
  if (drives.size > 1 && car.driveType) {
    const awdish = car.driveType === 'AWD' || car.driveType === '4WD';
    const othersAwd = set.some(
      (c) => c.id !== car.id && (c.driveType === 'AWD' || c.driveType === '4WD'),
    );
    if (awdish && !othersAwd)
      return t('The only {drive} here: better in snow', { drive: car.driveType });
    if (!awdish && othersAwd && set.filter((c) => c.driveType === car.driveType).length === 1) {
      return t('{drive} rather than AWD: lighter, and usually uses less fuel', {
        drive: car.driveType,
      });
    }
  }

  const bodies = new Set(set.map((c) => c.bodyStyle).filter(Boolean));
  if (bodies.size > 1 && car.bodyStyle) {
    const alone = set.filter((c) => c.bodyStyle === car.bodyStyle).length === 1;
    if (alone) {
      const label =
        car.bodyStyle === 'suv'
          ? t('SUV')
          : car.bodyStyle === 'truck'
            ? t('pickup')
            : car.bodyStyle;
      return t('The only {label} here', { label });
    }
  }

  return null;
}

function pickMetricEdge(car: CarSpecs, set: CarSpecs[]): string | null {
  const candidates: { score: number; text: string }[] = [];

  for (const metric of METRICS) {
    if (metric.key === 'mpg' && !sharedFuelUnit(set)) continue;
    // Estimated prices set no car apart: most are drawn from the size class.
    if (metric.key === 'price') continue;
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
      metric.key === 'hp'
        ? (n: number) => `${Math.round(n)}`
        : metric.key === 'range'
          ? (n: number) => `${rangeKm(n)}`
          : (n: number) => String(n);

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
    if (metric.key === 'mpg' && !sharedFuelUnit(set)) continue;
    const scored = set
      .map((c) => ({ car: c, value: metric.get(c) }))
      .filter((x): x is { car: CarSpecs; value: number } => x.value != null);
    if (scored.length < 2) continue;
    const values = scored.map((x) => x.value);
    if (!meaningfulSpread(values, metric.minAbsDelta, metric.minRelDelta)) continue;

    // Estimated values stay out of the summary: most come from the size class.
    if (metric.key === 'price') continue;

    if (metric.key === 'mpg') {
      // MPGe apart can be one figure in kWh/100 km: "runs 17.5" said nothing.
      const spread = fuelSpread(set[0], values);
      if (spread.includes('–')) axes.push(metric.axisLabel(`${spread} ${fuelUnit(set[0])}`));
      continue;
    }

    const fmt =
      metric.key === 'hp'
        ? (n: number) => t('{hp} hp', { hp: Math.round(n) })
        : metric.key === 'safety'
          ? (n: number) => `${n}/5`
          : metric.key === 'range'
            ? (n: number) => t('{km} km', { km: rangeKm(n) })
            : (n: number) => String(n);

    const lo = Math.min(...values);
    const hi = Math.max(...values);
    axes.push(metric.axisLabel(`${fmt(lo)}–${fmt(hi)}`));
  }

  const fuels = [...new Set(set.map((c) => formatFuelBadge(c.engine.fuelType)))];
  if (fuels.length > 1)
    axes.unshift(t('Different powertrains: {fuels}', { fuels: fuels.join(', ') }));

  const bodies = [
    ...new Set(
      set
        .map((c) =>
          c.bodyStyle === 'suv' ? t('SUV') : c.bodyStyle === 'truck' ? t('pickup') : c.bodyStyle,
        )
        .filter(Boolean),
    ),
  ];
  if (bodies.length > 1) axes.push(t('Different shapes: {bodies}', { bodies: bodies.join(', ') }));

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
    ? t('Close to the {names} on every figure on file', {
        names: similarNames.join(' and the '),
      })
    : t('Close to the others on every figure on file');
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
      edge: t('Your shortlist starts here — add another car to see trade-offs'),
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

const POWERTRAIN_KEY: Record<string, string> = {
  gasoline: 'gas',
  diesel: 'diesel',
  hybrid: 'hybrid',
  'plug-in hybrid': 'plug-in hybrid',
  electric: 'electric',
  hydrogen: 'fuel cell',
  'natural gas': 'natural gas',
};

function powertrainWord(fuelType: string): string {
  const key = POWERTRAIN_KEY[fuelType] ?? fuelType;
  if (key === 'gas') return t('gas');
  if (key === 'diesel') return t('diesel');
  if (key === 'hybrid') return t('hybrid');
  if (key === 'plug-in hybrid') return t('plug-in hybrid');
  if (key === 'electric') return t('electric');
  if (key === 'fuel cell') return t('fuel cell');
  if (key === 'natural gas') return t('natural gas');
  return key;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function bodyNoun(style: string): string {
  if (style === 'suv') return t('an SUV');
  if (style === 'truck') return t('a pickup');
  return /^[aeiou]/i.test(style) ? t('an {body}', { body: style }) : t('a {body}', { body: style });
}

const isAwd = (drive?: string) => drive === 'AWD' || drive === '4WD';
const isManual = (car: CarSpecs) => car.transmission?.type === 'manual';

/** What makes the alternative a different kind of car: powertrain, drive, gearbox, body. */
function kindDifference(anchor: CarSpecs, alt: CarSpecs): string | null {
  const fuel = alt.engine.fuelType;
  if (fuel !== anchor.engine.fuelType) {
    const text = t('{alt}, not {anchor}', {
      alt: capitalize(powertrainWord(fuel)),
      anchor: powertrainWord(anchor.engine.fuelType),
    });
    const a = alt.fuelEconomy.combined;
    const b = anchor.fuelEconomy.combined;
    return a && b && fuelUnit(alt) === fuelUnit(anchor)
      ? t('{kind} ({a} vs {b} {unit})', {
          kind: text,
          a: fuelUse(alt, a),
          b: fuelUse(anchor, b),
          unit: fuelUnit(alt),
        })
      : text;
  }
  if (alt.driveType && anchor.driveType && alt.driveType !== anchor.driveType) {
    if (isAwd(alt.driveType) && !isAwd(anchor.driveType)) {
      return t('{drive}, which this car lacks: better in snow', { drive: alt.driveType });
    }
    if (!isAwd(alt.driveType) && isAwd(anchor.driveType)) {
      return t('{drive}, not {other}: usually lighter and more efficient', {
        drive: alt.driveType,
        other: anchor.driveType,
      });
    }
    if (!isAwd(alt.driveType) && !isAwd(anchor.driveType)) {
      return t('{drive}, not {other}', { drive: alt.driveType, other: anchor.driveType });
    }
  }
  if (isManual(alt) !== isManual(anchor) && alt.transmission && anchor.transmission) {
    return isManual(alt) ? t('Manual, not automatic') : t('Automatic, not manual');
  }
  if (alt.bodyStyle && anchor.bodyStyle && alt.bodyStyle !== anchor.bodyStyle) {
    return capitalize(
      t('{alt}, not {anchor}', {
        alt: bodyNoun(alt.bodyStyle),
        anchor: bodyNoun(anchor.bodyStyle),
      }),
    );
  }
  return null;
}

interface PairMetric {
  get: (car: CarSpecs) => number | null;
  minAbs: number;
  minRel: number;
  higherIsBetter: boolean;
  text: (better: boolean, alt: number, anchor: number, car: CarSpecs) => string;
  /** Below 1, the difference speaks only when nothing measured differs as much. */
  weight?: number;
}

const PAIR_METRICS: PairMetric[] = [
  {
    get: (car) => car.fuelEconomy.combined ?? null,
    minAbs: 2,
    minRel: 0.06,
    higherIsBetter: true,
    text: (better, a, b, car) =>
      better
        ? t('Uses less fuel ({a} vs {b} {unit})', {
            a: fuelUse(car, a),
            b: fuelUse(car, b),
            unit: fuelUnit(car),
          })
        : t('Uses more fuel ({a} vs {b} {unit})', {
            a: fuelUse(car, a),
            b: fuelUse(car, b),
            unit: fuelUnit(car),
          }),
  },
  {
    get: (car) => car.engine.horsepower ?? null,
    minAbs: 25,
    minRel: 0.12,
    higherIsBetter: true,
    text: (better, a, b) =>
      better
        ? t('More power ({a} vs {b} hp)', { a: Math.round(a), b: Math.round(b) })
        : t('Less power ({a} vs {b} hp)', { a: Math.round(a), b: Math.round(b) }),
  },
  {
    get: (car) => {
      const s = car.safetyRating?.overall;
      return s != null && s > 0 ? s : null;
    },
    minAbs: 1,
    minRel: 0,
    higherIsBetter: true,
    text: (better, a, b) =>
      better
        ? t('Better NHTSA rating ({a}/5 vs {b}/5)', { a, b })
        : t('Lower NHTSA rating ({a}/5 vs {b}/5)', { a, b }),
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
      better
        ? t('Longer electric range ({a} vs {b} km)', { a: rangeKm(a), b: rangeKm(b) })
        : t('Shorter electric range ({a} vs {b} km)', { a: rangeKm(a), b: rangeKm(b) }),
  },
  {
    get: (car) => car.epa?.luggageVolumeCuFt ?? null,
    minAbs: 2,
    minRel: 0.12,
    higherIsBetter: true,
    text: (better, a, b) =>
      better
        ? t('Bigger trunk ({a} vs {b} L)', { a: litres(a), b: litres(b) })
        : t('Smaller trunk ({a} vs {b} L)', { a: litres(a), b: litres(b) }),
  },
  {
    // A year apart says less than any measured difference.
    get: (car) => car.year,
    minAbs: 2,
    minRel: 0,
    higherIsBetter: true,
    weight: 0.5,
    text: (better, a, b) =>
      better ? t('Newer ({a} vs {b})', { a, b }) : t('Older ({a} vs {b})', { a, b }),
  },
];

/**
 * The biggest measured difference worth a sentence, favouring the
 * alternative's strengths. Estimated prices are not compared: most are drawn
 * from the car's class, not its own price.
 */
function metricDifference(anchor: CarSpecs, alt: CarSpecs, skipMpg: boolean): string | null {
  let best: { score: number; text: string } | null = null;
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
    const score = size * (better ? 1.25 : 1) * (metric.weight ?? 1);
    if (!best || score > best.score) best = { score, text: metric.text(better, a, b, alt) };
  }
  return best?.text ?? null;
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
  if (hpA && hpB) figures.push(t('{a} vs {b} hp', { a: Math.round(hpA), b: Math.round(hpB) }));
  return figures.length
    ? t('Much the same on paper ({figures})', { figures: figures.join(', ') })
    : t('Close to this car on every spec on file');
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
