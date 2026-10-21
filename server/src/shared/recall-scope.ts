import type { FuelType } from '../types/car.types.js';

/**
 * Which powertrains a recall is for, from the scope Transport Canada's notice
 * opens with: "On certain RAV4 Prime models, …", "Certain Focus Electric
 * vehicles …", "On certain hybrid and plug-in hybrid vehicles, …". Recalls are
 * filed by model and year, so the gasoline 2021 RAV4's page listed three that
 * were for the RAV4 Prime alone.
 *
 * Read from the opening only, and every powertrain it names: "On certain
 * vehicles equipped with electric power steering" names none, so it is for
 * all; "a diesel or V-10 engine" names two.
 */
export type RecallPowertrain =
  'gasoline' | 'diesel' | 'hybrid' | 'plug-in hybrid' | 'electric' | 'natural gas';

const PLUG_IN =
  /\bplug-in(?: hybrid)?(?: electric)?\b|\bPHEVs?\b|\b(?:RAV4|Prius) Prime\b|\b4xe\b/gi;
const HYBRID = /\bhybrid\b|\bHEVs?\b/i;
const ELECTRIC =
  /\b(?:battery[- ])?electric (?:vehicles?|models?|versions?|trucks?|SUVs?|cars?)\b|\b[A-Z][\w-]* Electric\b|\bEVs?\b|\bBEVs?\b/;
const DIESEL = /\bdiesel\b/i;
const NATURAL_GAS = /\bnatural gas\b|\bCNG\b|\bpropane\b|\bbi-fuel\b/i;
const GASOLINE = /\bgas(?:oline)?\b|\bV-?(?:6|8|10|12)\b|\bpetrol\b/i;

/** The notice's opening: up to its first comma or full stop, after any "Issue:" heading. */
function opening(summary: string): string {
  const text = summary.replace(/^\s*issue\s*:\s*/i, '').trim();
  return text.split(/[.,;]/)[0] ?? '';
}

/** The powertrains a recall names in its opening; none means it is for every one. */
export function recallPowertrains(summary: string): RecallPowertrain[] {
  const scope = opening(summary);
  if (!/\b(?:certain|some|all)\b/i.test(scope)) return [];
  const found: RecallPowertrain[] = [];
  if (PLUG_IN.test(scope)) found.push('plug-in hybrid');
  PLUG_IN.lastIndex = 0;
  // What is left once the plug-in hybrids are named: "hybrid and plug-in hybrid".
  const rest = scope.replace(PLUG_IN, ' ');
  if (HYBRID.test(rest)) found.push('hybrid');
  // "hybrid electric vehicles (HEV)" are hybrids, not electric cars.
  const notHybrid = rest.replace(/\bhybrid electric\b/gi, ' ');
  if (ELECTRIC.test(notHybrid)) found.push('electric');
  if (DIESEL.test(scope)) found.push('diesel');
  if (NATURAL_GAS.test(scope)) found.push('natural gas');
  if (GASOLINE.test(scope.replace(NATURAL_GAS, ' '))) found.push('gasoline');
  return found;
}

/**
 * Whether a recall for those powertrains can cover a car with this one. Only a
 * scope that plainly leaves the car out says no: a plug-in hybrid can be among
 * "hybrid" or "electric vehicles", a mild hybrid among "hybrid" ones, a hybrid
 * has a gasoline engine (a V6 Highlander Hybrid's "V6 engine"), and hydrogen
 * and natural-gas cars are never ruled out.
 */
export function recallCanApply(
  powertrains: RecallPowertrain[],
  car: { fuelType: FuelType; mildHybrid?: boolean },
): boolean {
  if (!powertrains.length) return true;
  const has = (p: RecallPowertrain) => powertrains.includes(p);
  switch (car.fuelType) {
    case 'gasoline':
      return has('gasoline') || (!!car.mildHybrid && has('hybrid'));
    case 'diesel':
      return has('diesel');
    case 'hybrid':
      return has('hybrid') || has('gasoline');
    case 'plug-in hybrid':
      return has('plug-in hybrid') || has('hybrid') || has('electric') || has('gasoline');
    case 'electric':
      return has('electric');
    default:
      return true;
  }
}

const NAMES: Record<RecallPowertrain, string> = {
  gasoline: 'gasoline engines',
  diesel: 'diesel engines',
  hybrid: 'the hybrid',
  'plug-in hybrid': 'the plug-in hybrid',
  electric: 'the electric version',
  'natural gas': 'natural-gas versions',
};

/** "the plug-in hybrid", "the hybrid and the plug-in hybrid": who a recall for other versions is for. */
export function powertrainNames(powertrains: RecallPowertrain[]): string {
  const names = powertrains.map((p) => NAMES[p]);
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * A model year's recalls split by whether they can cover this car: those for
 * another powertrain alone (the RAV4 Prime's, on a gasoline RAV4) apart.
 */
export function splitRecalls<T extends { summary: string }>(
  recalls: T[],
  car: { fuelType: FuelType; mildHybrid?: boolean },
): { applies: T[]; other: Array<{ recall: T; powertrains: RecallPowertrain[] }> } {
  const applies: T[] = [];
  const other: Array<{ recall: T; powertrains: RecallPowertrain[] }> = [];
  for (const recall of recalls) {
    const powertrains = recallPowertrains(recall.summary);
    if (recallCanApply(powertrains, car)) applies.push(recall);
    else other.push({ recall, powertrains });
  }
  return { applies, other };
}
