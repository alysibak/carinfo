import type { CarDashboard, CarSpecs } from '../types/car.types';
import { efficiencyOf, rangeKm } from './efficiency';
import { formatMoney, formatMoneyShort } from './money';
import { displayModelLabel } from './trimLabel';

export interface ComparePair {
  car: CarSpecs;
  dashboard?: CarDashboard;
}

export interface CompareLine {
  carId: string;
  /** "2025 Toyota RAV4". */
  name: string;
  /** "The SUV, with a 5-star NHTSA rating and the lowest running costs." */
  sentence: string;
}

const isAwd = (drive?: string) => drive === 'AWD' || drive === '4WD';

function bodyWord(style?: string): string | null {
  if (!style) return null;
  if (style === 'suv') return 'SUV';
  if (style === 'truck') return 'pickup';
  return style;
}

const FUEL_WORD: Record<string, string> = {
  hybrid: 'hybrid',
  'plug-in hybrid': 'plug-in hybrid',
  electric: 'EV',
  diesel: 'diesel',
  hydrogen: 'fuel-cell car',
};

interface Scored {
  id: string;
  value: number;
}

/**
 * The one car ahead on a figure, if it is ahead by enough to matter: its
 * value and the runner-up's. Ties and near-ties crown nobody.
 */
function leader(
  scored: Scored[],
  lowerIsBetter: boolean,
  enough: (best: number, next: number) => boolean,
): { id: string; best: number; next: number } | null {
  if (scored.length < 2) return null;
  const sorted = [...scored].sort((a, b) =>
    lowerIsBetter ? a.value - b.value : b.value - a.value,
  );
  const [first, second] = sorted;
  return enough(first.value, second.value)
    ? { id: first.id, best: first.value, next: second.value }
    : null;
}

function joinWords(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * What each car on a compare page has that the others do not, in a sentence:
 * the only SUV, the only AWD, the cheapest to buy or run, the thriftiest, the
 * best NHTSA rating, the most power. The section used to print "Body styles:
 * sedan, suv" and "Different shape — the sedan in this set".
 */
export function summarizeComparison(pairs: ComparePair[]): CompareLine[] {
  if (pairs.length < 2) return [];
  const strengths = new Map<string, string[]>(pairs.map(({ car }) => [car.id, []]));
  const add = (id: string, text: string) => strengths.get(id)?.push(text);
  const cars = pairs.map((p) => p.car);

  // What kind of car it is, when it is the only one of its kind here.
  const kinds = new Map<string, string>();
  const bodies = new Set(cars.map((c) => bodyWord(c.bodyStyle)));
  for (const car of cars) {
    const body = bodyWord(car.bodyStyle);
    if (
      bodies.size > 1 &&
      body &&
      cars.filter((c) => bodyWord(c.bodyStyle) === body).length === 1
    ) {
      kinds.set(car.id, `the ${body}`);
    }
    const fuel = FUEL_WORD[car.engine.fuelType];
    if (fuel && cars.filter((c) => c.engine.fuelType === car.engine.fuelType).length === 1) {
      add(car.id, `the only ${fuel}`);
    }
    if (isAwd(car.driveType) && cars.filter((c) => isAwd(c.driveType)).length === 1) {
      add(car.id, `the only ${car.driveType} (better in snow)`);
    }
    if (
      car.transmission?.type === 'manual' &&
      cars.filter((c) => c.transmission?.type === 'manual').length === 1
    ) {
      add(car.id, 'the only manual');
    }
  }

  const value = leader(
    pairs.flatMap(({ car, dashboard }) => {
      const mid =
        dashboard && !dashboard.ownership.unvalued ? dashboard.ownership.marketValue.mid : 0;
      return mid > 0 ? [{ id: car.id, value: mid }] : [];
    }),
    true,
    (best, next) => next - best >= 1500 && (next - best) / next >= 0.06,
  );
  if (value) {
    add(
      value.id,
      `the cheapest to buy (~${formatMoneyShort(value.best)} against ~${formatMoneyShort(value.next)})`,
    );
  }

  const running = leader(
    pairs.flatMap(({ car, dashboard }) => {
      const mid = dashboard?.annualRunningCost?.mid;
      return mid && mid > 0 && !dashboard.ownership.unvalued ? [{ id: car.id, value: mid }] : [];
    }),
    true,
    (best, next) => next - best >= 250 && (next - best) / next >= 0.05,
  );
  if (running) {
    add(
      running.id,
      `the cheapest to run (about ${formatMoney(Math.round((running.next - running.best) / 50) * 50)} a year less)`,
    );
  }

  // Litres and kilowatt-hours do not compare: only when every car shares a unit.
  const efficiencies = cars.map((car) => ({ car, eff: efficiencyOf(car) }));
  const units = new Set(efficiencies.map(({ eff }) => eff?.unit));
  if (units.size === 1 && !units.has(undefined)) {
    const fuel = leader(
      efficiencies.map(({ car, eff }) => ({ id: car.id, value: eff!.value })),
      true,
      (best, next) => next - best >= 0.5,
    );
    if (fuel) {
      const unit = efficiencies[0].eff!.unit;
      add(
        fuel.id,
        `the least fuel (${fuel.best.toFixed(1)} against ${fuel.next.toFixed(1)} ${unit})`,
      );
    }
  }

  const rated = cars.filter((c) => (c.safetyRating?.overall ?? 0) > 0);
  if (rated.length === 1 && cars.length > 1) {
    add(rated[0].id, `the only one NHTSA has rated (${rated[0].safetyRating!.overall}/5)`);
  } else {
    const safety = leader(
      rated.map((c) => ({ id: c.id, value: c.safetyRating!.overall! })),
      false,
      (best, next) => best - next >= 1,
    );
    if (safety) add(safety.id, `the best NHTSA rating (${safety.best}/5)`);
  }

  const power = leader(
    cars.flatMap((c) => (c.engine.horsepower ? [{ id: c.id, value: c.engine.horsepower }] : [])),
    false,
    (best, next) => best - next >= 25 && (best - next) / next >= 0.1,
  );
  if (power) add(power.id, `the most power (${power.best} against ${power.next} hp)`);

  const range = leader(
    cars.flatMap((c) =>
      c.engine.fuelType === 'electric' && c.epa?.rangeMiles
        ? [{ id: c.id, value: c.epa.rangeMiles }]
        : [],
    ),
    false,
    (best, next) => best - next >= 20,
  );
  if (range)
    add(range.id, `the longest range (${rangeKm(range.best)} against ${rangeKm(range.next)} km)`);

  const year = leader(
    cars.map((c) => ({ id: c.id, value: c.year })),
    false,
    (best, next) => best - next >= 2,
  );
  if (year) add(year.id, `the newest (${year.best})`);

  return pairs.map(({ car }) => {
    const found = (strengths.get(car.id) ?? []).slice(0, 3);
    const kind = kinds.get(car.id);
    let sentence: string;
    if (kind && found.length) sentence = `${kind}: ${joinWords(found)}`;
    else if (kind) sentence = kind;
    else if (found.length) sentence = joinWords(found);
    else sentence = 'much the same as the others on paper';
    return {
      carId: car.id,
      name: `${car.year} ${car.make} ${displayModelLabel(car)}`,
      sentence: sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.',
    };
  });
}
