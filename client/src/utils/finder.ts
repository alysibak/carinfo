import { LATEST_FULL_MODEL_YEAR } from '@carinfo/config/model-years';
import type { CarFilter, SearchQuery } from '../types/car.types';
import { msg } from '../i18n';

/**
 * Three questions and a few must-haves, each answered from the public
 * records: rows of seats, the body, the fuel, the model year, NHTSA's and
 * Transport Canada's records. No budget question: every price on file is an
 * estimate, and the old quiz's price bands sorted cars on our guesses.
 */
export type Carry = 'five' | 'more' | 'load' | 'two';
export type RunsOn = 'gas' | 'hybrid' | 'plugin' | 'electric';
export type HowNew = 'new' | 'recent' | 'older';
export type MustHave = 'awd' | 'stars' | 'fcw' | 'recalls' | 'theft';

export interface FinderAnswers {
  carry?: Carry;
  runsOn?: RunsOn;
  howNew?: HowNew;
  must: MustHave[];
}

const NEW_FROM = LATEST_FULL_MODEL_YEAR - 1;

export const CARRY: Array<{ id: Carry; label: string; note: string }> = [
  { id: 'five', label: msg('Up to 5 people'), note: msg('Two rows of seats') },
  { id: 'more', label: msg('6 to 8 people'), note: msg('Three rows: minivans and big SUVs') },
  { id: 'load', label: msg('A load or a trailer'), note: msg('Pickups') },
  { id: 'two', label: msg('Two, for fun'), note: msg('Coupes and convertibles') },
];

export const RUNS_ON: Array<{ id: RunsOn; label: string }> = [
  { id: 'gas', label: msg('Gas or diesel') },
  { id: 'hybrid', label: msg('Hybrid') },
  { id: 'plugin', label: msg('Plug-in hybrid') },
  { id: 'electric', label: msg('Electric') },
];

export const HOW_NEW: Array<{ id: HowNew; from: number; to?: number }> = [
  { id: 'new', from: NEW_FROM },
  { id: 'recent', from: NEW_FROM - 5, to: NEW_FROM - 1 },
  { id: 'older', from: NEW_FROM - 15, to: NEW_FROM - 6 },
];

export const MUST_HAVES: Array<{ id: MustHave; label: string }> = [
  { id: 'awd', label: msg('All- or four-wheel drive') },
  { id: 'stars', label: msg('Five crash-test stars') },
  { id: 'fcw', label: msg('Collision warning standard') },
  { id: 'recalls', label: msg('No recalls in Canada') },
  { id: 'theft', label: msg('Not on the most-stolen list') },
];

export function finderFilters(answers: FinderAnswers): CarFilter {
  const filters: CarFilter = {};
  if (answers.carry === 'five') filters.threeRow = false;
  if (answers.carry === 'more') filters.threeRow = true;
  if (answers.carry === 'load') filters.bodyStyle = ['truck'];
  if (answers.carry === 'two') filters.bodyStyle = ['coupe', 'convertible'];
  if (answers.runsOn) {
    filters.fuelType = {
      gas: ['gasoline', 'diesel'],
      hybrid: ['hybrid'],
      plugin: ['plug-in hybrid'],
      electric: ['electric'],
    }[answers.runsOn];
  }
  const years = HOW_NEW.find((option) => option.id === answers.howNew);
  if (years) filters.year = { min: years.from, ...(years.to ? { max: years.to } : {}) };
  const must = new Set(answers.must);
  if (must.has('awd')) filters.driveType = ['AWD', '4WD'];
  if (must.has('stars')) filters.safety = { min: 5 };
  if (must.has('fcw')) filters.safetyTech = { features: ['fcw'], standard: true };
  if (must.has('recalls')) filters.noRecalls = true;
  if (must.has('theft')) filters.theftListed = false;
  return filters;
}

/** The search the answers make: one row per model, the cheapest to run first (an EV, the farthest). */
export function finderQuery(answers: FinderAnswers): SearchQuery {
  return {
    query: '',
    filters: finderFilters(answers),
    sort:
      answers.runsOn === 'electric'
        ? { field: 'range', order: 'desc' }
        : { field: 'runningCost', order: 'asc' },
    collapseByModel: true,
  };
}

const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  allowed.find((option) => option === value);

/** Answers kept in the address, so Back from the results finds them again. */
export function answersFromParams(params: URLSearchParams): FinderAnswers {
  return {
    carry: pick(params.get('carry'), ['five', 'more', 'load', 'two'] as const),
    runsOn: pick(params.get('runs'), ['gas', 'hybrid', 'plugin', 'electric'] as const),
    howNew: pick(params.get('new'), ['new', 'recent', 'older'] as const),
    must: (params.get('must') ?? '')
      .split(',')
      .map((id) =>
        pick(
          id,
          MUST_HAVES.map((m) => m.id),
        ),
      )
      .filter((id): id is MustHave => !!id),
  };
}

export function answersToParams(answers: FinderAnswers): URLSearchParams {
  const params = new URLSearchParams();
  if (answers.carry) params.set('carry', answers.carry);
  if (answers.runsOn) params.set('runs', answers.runsOn);
  if (answers.howNew) params.set('new', answers.howNew);
  if (answers.must.length) params.set('must', answers.must.join(','));
  return params;
}
