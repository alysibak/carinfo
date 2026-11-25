import type { CarDashboard, ClassComparison, ProvenanceSource } from '../types/car.types';
import type { SpecGlossaryKey } from './specGlossary';
import { efficiencyOf, rangeKm } from './efficiency';
import { formatEngineForDetail, hasNumericValue } from './dataValue';
import { formatTransmissionLabel } from './trimLabel';
import { formatMoney } from './money';
import { t } from '../i18n';

/**
 * The share of its rated range an EV kept at −7 °C (20 °F) with the heater on:
 * AAA's 2019 test of five EVs measured 41% less on average (12% less without
 * the heater). A planning figure for a Canadian winter day; newer cars with a
 * heat pump often lose less.
 */
export const WINTER_RANGE_SHARE = 0.59;

export type Tone = 'better' | 'worse' | 'neutral';

export interface KeyFigure {
  id: 'fuel' | 'range' | 'energy' | 'fuelCost' | 'safety' | 'power' | 'seats' | 'towing' | 'engine';
  label: string;
  /** The figure, large: "7.6", "5", "200", "1.5L I4 Turbo". */
  value: string;
  /** Small, beside the figure: "L/100 km", "/5", "hp". */
  unit?: string;
  /** NHTSA's stars, drawn beside a rating out of five. */
  stars?: number;
  /** A line under it: "In gas mode", "At $1.56/L and 15,000 km a year". */
  detail?: string;
  /** Where the figure comes from, shown as a chip beside it. */
  source?: ProvenanceSource;
  /** Against the class, from the same records: "1.5 L/100 km less than a typical sport compact". */
  comparison?: { text: string; tone: Tone };
  /** The car's figure and the class's middle, for a bar that sets one against the other. */
  scale?: { car: number; typical: number };
  glossaryKey?: SpecGlossaryKey;
  /** Shown but not on file. */
  missing?: boolean;
}

/** "a typical sport compact", "a typical compact SUV". */
export function typicalOf(className: string): string {
  const noun = className.charAt(0).toLowerCase() + className.slice(1);
  return t('a typical {noun}', { noun });
}

function fuelVsClass(
  fuel: NonNullable<ClassComparison['fuel']>,
  className: string,
): KeyFigure['comparison'] {
  const diff = fuel.car - fuel.median;
  // Under 0.3 L/100 km is about $50 a year: the same, for anyone deciding.
  const threshold = fuel.unit === 'L/100 km' ? 0.3 : 0.5;
  if (Math.abs(diff) < threshold) {
    return {
      text: t('About the same as {typical}', { typical: typicalOf(className) }),
      tone: 'neutral',
    };
  }
  const amount = Math.abs(diff).toFixed(1);
  return {
    text:
      diff < 0
        ? t('{amount} {unit} less than {typical}', {
            amount,
            unit: fuel.unit,
            typical: typicalOf(className),
          })
        : t('{amount} {unit} more than {typical}', {
            amount,
            unit: fuel.unit,
            typical: typicalOf(className),
          }),
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
    return {
      text: t('About the same as {typical}', { typical: typicalOf(className) }),
      tone: 'neutral',
    };
  }
  const amount = Math.abs(Math.round(diff));
  return {
    text:
      diff > 0
        ? t('{amount} hp more than {typical}', { amount, typical: typicalOf(className) })
        : t('{amount} hp less than {typical}', { amount, typical: typicalOf(className) }),
    tone: 'neutral',
  };
}

/**
 * Where a horsepower figure comes from, in words and as a source chip. EPA's
 * fuel-economy records carry no horsepower, so a figure with no recorded
 * source gets no chip rather than an "EPA" it did not come from.
 */
function powerSource(dashboard: CarDashboard): { detail?: string; source?: ProvenanceSource } {
  const { car } = dashboard;
  const prov =
    dashboard.fieldProvenance?.['engine.horsepower'] ?? car.provenance?.['engine.horsepower'];
  if (car.engine.horsepowerBasis === 'sibling') {
    return { detail: t('Same engine in this model'), source: 'estimated' };
  }
  if (prov === 'estimated') return { detail: t('Estimated output'), source: 'estimated' };
  // A figure on record says where from in its chip alone: "EPA test-car
  // rating" under it said nothing a shopper uses.
  if (car.engine.horsepowerBasis === 'manufacturer') return { source: 'curated' };
  // EPA's Test Car List, another EPA dataset than FuelEconomy.gov's ratings.
  if (prov === 'curated' || prov === 'epa') return { source: 'epa' };
  return {};
}

/**
 * The figures a car page leads with: the ones on record, each with its
 * source. What EPA measured (fuel use, or an EV's range and energy use), how
 * NHTSA's crash tests went, and the car's rated power and engine, set against
 * its class from those same records. Estimated value and running costs are
 * not here: the page shows them further down, labelled as estimates.
 */
export function buildKeyFigures(
  dashboard: CarDashboard,
  /** The yearly fuel or electricity bill, where the page works it out: dollars say more than litres. */
  fuelCost?: { amount: number; basis: string; electric?: boolean },
): KeyFigure[] {
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
    const km = rangeKm(rangeMiles!);
    figures.push({
      id: 'range',
      label: recordSource === 'epa' ? t('EPA range') : t('Range'),
      value: String(km),
      unit: 'km',
      // A cold day's range for planning: AAA's measured average loss (see the
      // glossary's range entry, which says where it is from).
      detail: t('Full charge; about {km} km at −7 °C, heat on', {
        km: Math.round(km * WINTER_RANGE_SHARE),
      }),
      source: recordSource,
      glossaryKey: 'range',
    });
  }

  if (efficiency) {
    const [number, ...unitWords] = efficiency.text.split(' ');
    // A plug-in hybrid's figure is its gas-mode use: said beneath, so the
    // label stays short enough for a phone.
    const gasMode = efficiency.label === 'Gas-mode fuel use';
    const efficiencyLabel =
      gasMode || efficiency.label === 'Fuel use'
        ? t('Fuel use')
        : efficiency.label === 'Energy use'
          ? t('Energy use')
          : efficiency.label === 'Hydrogen use'
            ? t('Hydrogen use')
            : t('Fuel use');
    figures.push({
      id: isEv ? 'energy' : 'fuel',
      label: efficiencyLabel,
      value: number,
      unit: unitWords.join(' '),
      // EPA's US miles per gallon left to the spec list: a Canadian reads litres.
      detail: gasMode ? t('In gas mode') : undefined,
      source: recordSource,
      glossaryKey: 'efficiency',
      comparison:
        cls?.fuel && className && cls.fuel.unit === efficiency.unit
          ? fuelVsClass(cls.fuel, className)
          : undefined,
      scale:
        cls?.fuel && className && cls.fuel.unit === efficiency.unit
          ? { car: cls.fuel.car, typical: cls.fuel.median }
          : undefined,
    });
  }

  const overall = car.safetyRating?.overall;
  figures.push(
    hasNumericValue(overall, { allowZero: false })
      ? {
          id: 'safety',
          label: t('Safety'),
          value: String(overall),
          unit: '/5',
          stars: overall,
          detail:
            (car.safetyRating?.nhtsaIds?.length ?? 0) > 1
              ? t('Overall crash-test stars, the lowest of {count} versions tested', {
                  count: car.safetyRating!.nhtsaIds!.length,
                })
              : t('Overall crash-test stars'),
          source: 'nhtsa',
          glossaryKey: 'safetyOverall',
        }
      : {
          id: 'safety',
          label: t('Safety'),
          // "Not rated" said NHTSA never tested it; often it did, and the
          // rating is not matched to this version here.
          value: t('Not on file'),
          detail: t('No NHTSA crash rating on file for this version'),
          glossaryKey: 'safetyOverall',
          missing: true,
        },
  );

  if (hasNumericValue(car.engine.horsepower)) {
    const { detail, source } = powerSource(dashboard);
    figures.push({
      id: 'power',
      label: t('Power'),
      value: String(car.engine.horsepower),
      unit: t('hp'),
      detail,
      source,
      glossaryKey: 'power',
      comparison:
        cls?.horsepower && className ? powerVsClass(cls.horsepower, className) : undefined,
      scale:
        cls?.horsepower && className
          ? { car: cls.horsepower.car, typical: cls.horsepower.median }
          : undefined,
    });
  }

  // What a family asks next: how many it seats, what it tows. The maker's figures.
  if (hasNumericValue(car.seats)) {
    figures.push({
      id: 'seats',
      label: t('Seats'),
      value:
        car.seatsMax != null && car.seatsMax !== car.seats
          ? `${car.seats}–${car.seatsMax}`
          : String(car.seats),
      detail: t('From the maker'),
      source: car.provenance?.seats ?? 'curated',
    });
  }
  if (hasNumericValue(car.towingCapacityLb)) {
    figures.push({
      id: 'towing',
      label: t('Tows up to'),
      value: car.towingCapacityLb!.toLocaleString('en-CA'),
      unit: t('lb'),
      detail: t('Properly equipped, from the maker'),
      source: car.provenance?.towingCapacityLb ?? 'curated',
    });
  }

  if (fuelCost) {
    figures.push({
      id: 'fuelCost',
      label: fuelCost.electric ? t('Charging a year') : t('Fuel a year'),
      value: formatMoney(fuelCost.amount),
      detail: fuelCost.basis,
      source: 'estimated',
    });
  }

  // An EV has shown range and energy use; for the rest, the engine rounds out four.
  if (!isEv && figures.length < 4) {
    // A fuel cell in a word that fits the tile, not "Hydrogen Fuel Cell System".
    const engine =
      car.engine.fuelType === 'hydrogen' ? t('Fuel cell') : formatEngineForDetail(car.engine);
    if (engine !== 'Not on file') {
      figures.push({
        id: 'engine',
        label: t('Engine'),
        value: engine,
        source: recordSource,
        glossaryKey: 'engine',
      });
    }
  }

  // What it uses, what that costs a year, how it crashed, its power: an EV's
  // energy use per 100 km and a car's engine where there is room.
  const order: KeyFigure['id'][] = fuelCost
    ? ['range', 'fuel', 'fuelCost', 'safety', 'power', 'seats', 'towing', 'energy', 'engine']
    : ['range', 'energy', 'fuel', 'safety', 'power', 'seats', 'towing', 'engine'];
  return figures
    .filter((figure) => order.includes(figure.id))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .slice(0, 4);
}

/**
 * The line under a car page's title: the gearbox, the drive, and a 0–60 time
 * only when one is on record (a predicted time is an estimate, and waits in
 * the spec list with the other estimates).
 */
export function buildSpecLine(
  dashboard: CarDashboard,
  /** The engine leads the line where the key figures leave it out. */
  withEngine = false,
): string[] {
  const { car } = dashboard;
  const parts: string[] = [];
  if (withEngine && car.engine.fuelType !== 'electric') {
    const engine = formatEngineForDetail(car.engine);
    if (engine !== 'Not on file') parts.push(engine);
  }
  // An electric car's one gear is not a gearbox worth naming: EPA's "Automatic (A1)".
  if (car.transmission?.type && car.engine.fuelType !== 'electric')
    parts.push(formatTransmissionLabel(car.transmission));
  if (car.driveType) parts.push(car.driveType);
  if (dashboard.zeroToSixty?.method === 'actual') {
    parts.push(t('0–60 mph {seconds} s', { seconds: dashboard.zeroToSixty.value.toFixed(1) }));
  }
  return parts;
}
