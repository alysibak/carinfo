import type { CarSpecs } from '../types/car.types';
import { formatEngineForDetail } from './dataValue';
import { formatCarFuelLabel } from './fuelDisplay';
import { displayModelLabel } from './trimLabel';
import { bodyStyleLabel } from './bodyStyleLabel';
import { msg } from '../i18n';

/**
 * A model year's versions, told apart the way a buyer knows them: what it
 * runs on, its drive, its body and doors, its engine, a manual or not, and
 * a special edition (Raptor, Type R, Rubicon). EPA names versions by engine,
 * gearbox and drive, and eleven F-150s all read "F150 Pickup"; picking two
 * or three of these finds the one.
 */
export type ChoiceId = 'power' | 'drive' | 'body' | 'doors' | 'engine' | 'gearbox' | 'edition';

export interface Choice {
  id: ChoiceId;
  label: string;
  /** Each value the year's versions have, in a sensible order. */
  options: string[];
}

export type Picks = Partial<Record<ChoiceId, string>>;

export const CHOICE_IDS: ChoiceId[] = [
  'power',
  'drive',
  'body',
  'doors',
  'engine',
  'gearbox',
  'edition',
];

const LABELS: Record<ChoiceId, string> = {
  power: msg('Runs on'),
  drive: msg('Drive'),
  body: msg('Body'),
  doors: msg('Doors'),
  engine: msg('Engine'),
  gearbox: msg('Gearbox'),
  edition: msg('Edition'),
};

const DRIVE_ORDER = ['FWD', 'RWD', 'AWD', '4WD'];
/** Words in a version's name that the other choices already say. */
const SAID_ELSEWHERE =
  /^(2wd|4wd|awd|fwd|rwd|4x4|4x2|hev|phev|hybrid|plug-in|electric|ev|[2-5]-?dr|[2-5]-door|pickup|sedan|hatchback|coupe|convertible|wagon|cab|suv|van)$/i;

/** Doors, as EPA's model name gives them ("Wrangler 2dr 4WD"); the shown name drops them. */
const doorsOf = (car: CarSpecs): string | null => {
  const match = /\b([2-5])[-\s]?(?:dr|door)\b/i.exec(car.model);
  return match ? match[1] : null;
};

/**
 * EPA's test set-ups in a name, which no buyer chooses by: the engine size
 * (the engine choice says it), flex fuel, weight classes, payload and tires.
 */
const TEST_SETUP =
  /\b(?:\d+(?:\.\d+)?L|FFV|GVWR\s*[<>]?\s*\d+\s*LBS?|BASE\s+PAYLOAD(?:\s+LT)?(?:\s+TIRES?)?|LT\s+TIRES?|PAYLOAD)\b/gi;

/** EPA's capitals as the badge reads: "RAPTOR" is a Raptor, "TYPE R" a Type R; "SRT" stays. */
const asBadge = (word: string) =>
  /^[A-Z]{4,}$/.test(word) ? word[0] + word.slice(1).toLowerCase() : word;

/** The words of each version's name that are its own: "Tremor", "Type R", "Rubicon". */
function editions(cars: CarSpecs[]): Map<string, string> {
  const words = cars.map((car) =>
    displayModelLabel(car).replace(TEST_SETUP, ' ').trim().split(/\s+/),
  );
  let common = 0;
  while (words.every((w) => w.length > common && w[common] === words[0][common])) common += 1;
  return new Map(
    cars.map((car, i) => {
      const own = words[i].slice(common).filter((word) => !SAID_ELSEWHERE.test(word));
      return [car.id, own.map(asBadge).join(' ') || 'Standard'];
    }),
  );
}

function valueOf(car: CarSpecs, id: ChoiceId, edition: Map<string, string>): string | null {
  switch (id) {
    case 'power':
      return formatCarFuelLabel(car);
    case 'drive':
      return car.driveType || null;
    case 'body':
      return bodyStyleLabel(car.bodyStyle) || null;
    case 'doors':
      return doorsOf(car);
    case 'engine': {
      const engine = formatEngineForDetail(car.engine);
      return engine === 'Not on file' ? null : engine;
    }
    case 'gearbox':
      return car.transmission
        ? car.transmission.type === 'manual'
          ? 'Manual'
          : 'Automatic'
        : null;
    case 'edition':
      return edition.get(car.id) ?? null;
  }
}

/** A version's value for each choice, for matching. */
export function versionValues(cars: CarSpecs[]): Map<string, Partial<Record<ChoiceId, string>>> {
  const edition = editions(cars);
  return new Map(
    cars.map((car) => [
      car.id,
      Object.fromEntries(
        CHOICE_IDS.map((id) => [id, valueOf(car, id, edition)]).filter(([, value]) => value),
      ) as Partial<Record<ChoiceId, string>>,
    ]),
  );
}

/** How a choice splits the versions, as sets of ids: two splits alike say the same. */
function splitBy(cars: CarSpecs[], values: ReturnType<typeof versionValues>, id: ChoiceId) {
  const groups = new Map<string, string[]>();
  for (const car of cars) {
    const value = values.get(car.id)?.[id] ?? '';
    groups.set(value, [...(groups.get(value) ?? []), car.id]);
  }
  return [...groups.values()]
    .map((ids) => ids.join(','))
    .sort()
    .join('|');
}

/** The choices that tell this year's versions apart: those with two values or more. */
export function versionChoices(cars: CarSpecs[]): Choice[] {
  const values = versionValues(cars);
  // The doors say nothing the body has not where every sedan has four and
  // every hatchback five.
  const doorsSayBody = splitBy(cars, values, 'doors') === splitBy(cars, values, 'body');
  return CHOICE_IDS.flatMap((id): Choice[] => {
    if (id === 'doors' && doorsSayBody) return [];
    const seen = new Set<string>();
    for (const car of cars) {
      const value = values.get(car.id)?.[id];
      if (value) seen.add(value);
    }
    if (seen.size < 2) return [];
    const options = [...seen].sort((a, b) => {
      if (id === 'drive') return DRIVE_ORDER.indexOf(a) - DRIVE_ORDER.indexOf(b);
      if (id === 'edition' && (a === 'Standard' || b === 'Standard'))
        return a === 'Standard' ? -1 : 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
    return [{ id, label: LABELS[id], options }];
  });
}

/** The versions that have every pick; a pick no version has is ignored. */
export function matchVersions(cars: CarSpecs[], picks: Picks): CarSpecs[] {
  const values = versionValues(cars);
  return cars.filter((car) =>
    (Object.entries(picks) as Array<[ChoiceId, string | undefined]>).every(
      ([id, value]) => !value || values.get(car.id)?.[id] === value,
    ),
  );
}

/** How many versions an option would leave, with the other picks kept. */
export function countWith(cars: CarSpecs[], picks: Picks, id: ChoiceId, value: string): number {
  return matchVersions(cars, { ...picks, [id]: value }).length;
}
