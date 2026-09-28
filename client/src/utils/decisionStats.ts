import type { CarDashboard, ClassComparison } from '../types/car.types';
import type { SpecGlossaryKey } from './specGlossary';
import { efficiencyOf, rangeKm } from './efficiency';
import { formatMoneyRange } from './money';
import { formatEngineForDetail, hasNumericValue } from './dataValue';
import { formatTransmissionLabel } from './trimLabel';

export type Tone = 'better' | 'worse' | 'neutral';

export interface DecisionStat {
  id: 'value' | 'cost' | 'fuel' | 'range' | 'energy' | 'safety' | 'power' | 'engine';
  label: string;
  /** The figure, large: "$29k–$39k", "7.6", "5". */
  value: string;
  /** Small, beside the figure: "L/100 km", "/5", "a year". */
  unit?: string;
  /** A line under it: "31 mpg combined", "NHTSA overall". */
  detail?: string;
  /** Against the class, when there is one: "7% less than a typical sport compact". */
  comparison?: { text: string; tone: Tone };
  glossaryKey?: SpecGlossaryKey;
  /** Shown but not on file. */
  missing?: boolean;
}

/** "a typical sport compact", "a typical compact SUV". */
export function typicalOf(className: string): string {
  const noun = className.charAt(0).toLowerCase() + className.slice(1);
  return `a typical ${noun}`;
}

/** Percent against the class median; within 5% reads "about the same". */
function percentVsClass(
  car: number,
  median: number,
  className: string,
  lowerIsBetter: boolean | null,
): DecisionStat['comparison'] {
  if (!(median > 0)) return undefined;
  const pct = (car - median) / median;
  if (Math.abs(pct) < 0.05) {
    return { text: `About the same as ${typicalOf(className)}`, tone: 'neutral' };
  }
  const more = pct > 0;
  const tone: Tone =
    lowerIsBetter == null ? 'neutral' : more === lowerIsBetter ? 'worse' : 'better';
  return {
    text: `${Math.round(Math.abs(pct) * 100)}% ${more ? 'more' : 'less'} than ${typicalOf(className)}`,
    tone,
  };
}

function fuelVsClass(
  fuel: NonNullable<ClassComparison['fuel']>,
  className: string,
): DecisionStat['comparison'] {
  const diff = fuel.car - fuel.median;
  // Under 0.3 L/100 km is about $50 a year: the same, for anyone deciding.
  const threshold = fuel.unit === 'L/100 km' ? 0.3 : 0.5;
  if (Math.abs(diff) < threshold) {
    return { text: `About the same as ${typicalOf(className)}`, tone: 'neutral' };
  }
  return {
    text: `${Math.abs(diff).toFixed(1)} ${fuel.unit} ${diff < 0 ? 'less' : 'more'} than ${typicalOf(className)}`,
    tone: diff < 0 ? 'better' : 'worse',
  };
}

/**
 * The four figures a car page leads with: what it is worth, what it costs a
 * year, what it burns, and how it did in NHTSA's crash tests, each set against
 * its class. Power and the engine go to the spec line under the title, except
 * for a car the site does not value, which leads with them instead.
 */
export function buildDecisionStats(dashboard: CarDashboard): DecisionStat[] {
  const { car, ownership, annualRunningCost, classComparison: cls, evCharge } = dashboard;
  const stats: DecisionStat[] = [];
  const className = cls?.className;

  if (ownership.unvalued) {
    if (hasNumericValue(car.engine.horsepower)) {
      stats.push({
        id: 'power',
        label: 'Power',
        value: String(car.engine.horsepower),
        unit: 'hp',
        glossaryKey: 'power',
        comparison:
          cls?.horsepower && className
            ? percentVsClass(cls.horsepower.car, cls.horsepower.median, className, null)
            : undefined,
      });
    }
    const engine = formatEngineForDetail(car.engine);
    if (engine !== 'Not on file') {
      stats.push({ id: 'engine', label: 'Engine', value: engine, glossaryKey: 'engine' });
    }
  } else {
    const { marketValue } = ownership;
    if (hasNumericValue(marketValue.low) && hasNumericValue(marketValue.high)) {
      stats.push({
        id: 'value',
        label: 'Est. value',
        value: formatMoneyRange(marketValue.low, marketValue.high),
        glossaryKey: 'msrp',
        comparison:
          cls?.value && className
            ? percentVsClass(cls.value.car, cls.value.median, className, null)
            : undefined,
      });
    }
    if (annualRunningCost && hasNumericValue(annualRunningCost.mid)) {
      stats.push({
        id: 'cost',
        label: 'Yearly cost',
        value: formatMoneyRange(annualRunningCost.low, annualRunningCost.high),
        unit: 'a year',
        detail: 'Fuel, insurance, upkeep',
        glossaryKey: 'annualFuelCost',
        comparison:
          cls?.annualCost && className
            ? percentVsClass(cls.annualCost.car, cls.annualCost.median, className, true)
            : undefined,
      });
    }
  }

  const efficiency = efficiencyOf({
    ...car,
    epa: { ...car.epa, kWhPer100Mi: evCharge?.kWhPer100Mi ?? car.epa?.kWhPer100Mi },
  });
  const rangeMiles = evCharge?.rangeMiles ?? car.epa?.rangeMiles;
  const isEv = car.engine.fuelType === 'electric';

  if (isEv && hasNumericValue(rangeMiles)) {
    stats.push({
      id: 'range',
      label: 'EPA range',
      value: String(rangeKm(rangeMiles!)),
      unit: 'km',
      detail: `${Math.round(rangeMiles!)} mi on a full charge`,
      glossaryKey: 'range',
    });
  }

  if (efficiency) {
    const [number, ...unitWords] = efficiency.text.split(' ');
    stats.push({
      id: isEv ? 'energy' : 'fuel',
      label: efficiency.label,
      value: number,
      unit: unitWords.join(' '),
      detail: efficiency.epa ? `${efficiency.epa} combined` : undefined,
      glossaryKey: 'efficiency',
      comparison:
        cls?.fuel && className && cls.fuel.unit === efficiency.unit
          ? fuelVsClass(cls.fuel, className)
          : undefined,
    });
  }

  const overall = car.safetyRating?.overall;
  stats.push(
    hasNumericValue(overall, { allowZero: false })
      ? {
          id: 'safety',
          label: 'Safety',
          value: String(overall),
          unit: '/5',
          detail: 'NHTSA overall stars',
          glossaryKey: 'safetyOverall',
        }
      : {
          id: 'safety',
          label: 'Safety',
          value: 'Not rated',
          detail: 'No NHTSA crash test on file',
          glossaryKey: 'safetyOverall',
          missing: true,
        },
  );

  return stats;
}

/** The spec line under a car page's title: "200 hp · 1.5L I4 turbo · 6-speed manual · FWD". */
export function buildSpecLine(dashboard: CarDashboard): string[] {
  const { car, ownership } = dashboard;
  const parts: string[] = [];
  // A car without a value leads with power and the engine in its figures instead.
  if (!ownership.unvalued) {
    if (hasNumericValue(car.engine.horsepower)) {
      const estimated = car.provenance?.['engine.horsepower'] === 'estimated';
      parts.push(`${car.engine.horsepower} hp${estimated ? ' (est.)' : ''}`);
    }
    const engine = formatEngineForDetail(car.engine);
    if (engine !== 'Not on file') parts.push(engine);
  }
  if (car.transmission?.type) parts.push(formatTransmissionLabel(car.transmission));
  if (car.driveType) parts.push(car.driveType);
  if (dashboard.zeroToSixty) {
    const { value, method } = dashboard.zeroToSixty;
    parts.push(`0–60 mph ${method === 'actual' ? '' : '~'}${value.toFixed(1)} s`);
  }
  return parts;
}
