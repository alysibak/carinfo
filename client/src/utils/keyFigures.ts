import type { CarDashboard, ClassComparison, ProvenanceSource } from '../types/car.types';
import type { SpecGlossaryKey } from './specGlossary';
import { efficiencyOf, rangeKm } from './efficiency';
import { formatEngineForDetail, hasNumericValue } from './dataValue';
import { formatTransmissionLabel } from './trimLabel';

export type Tone = 'better' | 'worse' | 'neutral';

export interface KeyFigure {
  id: 'fuel' | 'range' | 'energy' | 'safety' | 'power' | 'engine';
  label: string;
  /** The figure, large: "7.6", "5", "200", "1.5L I4 Turbo". */
  value: string;
  /** Small, beside the figure: "L/100 km", "/5", "hp". */
  unit?: string;
  /** A line under it: "31 mpg combined", "EPA test-car rating". */
  detail?: string;
  /** Where the figure comes from, shown as a chip beside it. */
  source?: ProvenanceSource;
  /** Against the class, from the same records: "1.5 L/100 km less than a typical sport compact". */
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

function fuelVsClass(
  fuel: NonNullable<ClassComparison['fuel']>,
  className: string,
): KeyFigure['comparison'] {
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

function powerVsClass(
  power: NonNullable<ClassComparison['horsepower']>,
  className: string,
): KeyFigure['comparison'] {
  const diff = power.car - power.median;
  // More power is neither better nor worse: a fact about the car, in grey.
  if (Math.abs(diff) / power.median < 0.05) {
    return { text: `About the same as ${typicalOf(className)}`, tone: 'neutral' };
  }
  return {
    text: `${Math.abs(Math.round(diff))} hp ${diff > 0 ? 'more' : 'less'} than ${typicalOf(className)}`,
    tone: 'neutral',
  };
}

/**
 * Where a horsepower figure comes from, in words and as a source chip. EPA's
 * fuel-economy records carry no horsepower, so a figure with no recorded
 * source gets no chip rather than an "EPA" it did not come from.
 */
function powerSource(dashboard: CarDashboard): { detail: string; source?: ProvenanceSource } {
  const { car } = dashboard;
  const prov =
    dashboard.fieldProvenance?.['engine.horsepower'] ?? car.provenance?.['engine.horsepower'];
  if (car.engine.horsepowerBasis === 'sibling') {
    return { detail: 'Same engine in this model', source: 'estimated' };
  }
  if (prov === 'estimated') return { detail: 'Estimated output', source: 'estimated' };
  if (car.engine.horsepowerBasis === 'manufacturer') {
    return {
      detail:
        car.engine.fuelType === 'electric' ? 'Manufacturer motor rating' : 'Manufacturer rating',
      source: 'curated',
    };
  }
  if (prov === 'curated') return { detail: 'EPA test-car rating', source: 'curated' };
  if (prov === 'epa') return { detail: 'Rated output', source: 'epa' };
  return { detail: 'Rated output' };
}

/**
 * The figures a car page leads with: the ones on record, each with its
 * source. What EPA measured (fuel use, or an EV's range and energy use), how
 * NHTSA's crash tests went, and the car's rated power and engine, set against
 * its class from those same records. Estimated value and running costs are
 * not here: the page shows them further down, labelled as estimates.
 */
export function buildKeyFigures(dashboard: CarDashboard): KeyFigure[] {
  const { car, classComparison: cls, evCharge } = dashboard;
  const figures: KeyFigure[] = [];
  const className = cls?.className;
  const isEv = car.engine.fuelType === 'electric';

  const efficiency = efficiencyOf({
    ...car,
    epa: { ...car.epa, kWhPer100Mi: evCharge?.kWhPer100Mi ?? car.epa?.kWhPer100Mi },
  });
  const rangeMiles = evCharge?.rangeMiles ?? car.epa?.rangeMiles;
  // EPA's record, or Natural Resources Canada's for a car EPA never rated.
  const recordSource: ProvenanceSource =
    car.provenance?.['fuelEconomy.combined'] === 'nrcan' ? 'nrcan' : 'epa';

  if (isEv && hasNumericValue(rangeMiles)) {
    figures.push({
      id: 'range',
      label: recordSource === 'epa' ? 'EPA range' : 'Range',
      value: String(rangeKm(rangeMiles!)),
      unit: 'km',
      detail: `${Math.round(rangeMiles!)} mi on a full charge`,
      source: recordSource,
      glossaryKey: 'range',
    });
  }

  if (efficiency) {
    const [number, ...unitWords] = efficiency.text.split(' ');
    // A plug-in hybrid's figure is its gas-mode use: said beneath, so the
    // label stays short enough for a phone.
    const gasMode = efficiency.label === 'Gas-mode fuel use';
    figures.push({
      id: isEv ? 'energy' : 'fuel',
      label: gasMode ? 'Fuel use' : efficiency.label,
      value: number,
      unit: unitWords.join(' '),
      detail: efficiency.epa
        ? `${gasMode ? 'In gas mode, ' : ''}${efficiency.epa} combined`
        : undefined,
      source: recordSource,
      glossaryKey: 'efficiency',
      comparison:
        cls?.fuel && className && cls.fuel.unit === efficiency.unit
          ? fuelVsClass(cls.fuel, className)
          : undefined,
    });
  }

  const overall = car.safetyRating?.overall;
  figures.push(
    hasNumericValue(overall, { allowZero: false })
      ? {
          id: 'safety',
          label: 'Safety',
          value: String(overall),
          unit: '/5',
          detail: 'Overall crash-test stars',
          source: 'nhtsa',
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

  if (hasNumericValue(car.engine.horsepower)) {
    const { detail, source } = powerSource(dashboard);
    figures.push({
      id: 'power',
      label: 'Power',
      value: String(car.engine.horsepower),
      unit: 'hp',
      detail,
      source,
      glossaryKey: 'power',
      comparison:
        cls?.horsepower && className ? powerVsClass(cls.horsepower, className) : undefined,
    });
  }

  // An EV has shown range and energy use; for the rest, the engine rounds out four.
  if (!isEv && figures.length < 4) {
    const engine = formatEngineForDetail(car.engine);
    if (engine !== 'Not on file') {
      figures.push({
        id: 'engine',
        label: 'Engine',
        value: engine,
        source: recordSource,
        glossaryKey: 'engine',
      });
    }
  }

  return figures.slice(0, 4);
}

/**
 * The line under a car page's title: the gearbox, the drive, and a 0–60 time
 * only when one is on record (a predicted time is an estimate, and waits in
 * the spec list with the other estimates).
 */
export function buildSpecLine(dashboard: CarDashboard): string[] {
  const { car } = dashboard;
  const parts: string[] = [];
  if (car.transmission?.type) parts.push(formatTransmissionLabel(car.transmission));
  if (car.driveType) parts.push(car.driveType);
  if (dashboard.zeroToSixty?.method === 'actual') {
    parts.push(`0–60 mph ${dashboard.zeroToSixty.value.toFixed(1)} s`);
  }
  return parts;
}
