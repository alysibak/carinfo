import type { CarSpecs } from '../types/car.types';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import { DISPLAY_CURRENCY } from './currency';

const REGION = getRegionalAssumptions();

/**
 * Helpers that turn raw EPA enrichment fields into dual-framed content:
 * a plain-language line for novices + the underlying technical figure for enthusiasts.
 * All values stay EPA-sourced (keep the EPA trust badge alongside them).
 */

export interface FuelSavings {
  /** Absolute CAD magnitude, rounded to avoid false precision. */
  cad: number;
  /** True when the vehicle costs LESS to fuel than the average new vehicle. */
  saves: boolean;
}

/**
 * EPA's 5-year "you save / spend" vs. the average new vehicle (USD), converted to
 * CAD for display. It's a national EPA estimate, so we round it coarsely.
 */
export function fiveYearFuelSavings(car: CarSpecs): FuelSavings | null {
  // EPA's figure assumes US hydrogen pricing; the page already states H₂ fuel
  // cost can't be modelled for Ontario, so suppress it here to stay consistent.
  if (car.engine?.fuelType === 'hydrogen') return null;
  const usd = car.epa?.fuelSavings5yrUsd;
  if (usd == null || usd === 0) return null;
  const cad = Math.round((Math.abs(usd) * REGION.cadUsdExchangeRate) / 50) * 50;
  if (cad === 0) return null;
  return { cad, saves: usd > 0 };
}

/** Compact glance value, e.g. "$5,500 less". */
export function fuelSavingsShort(s: FuelSavings): string {
  return `$${s.cad.toLocaleString()} ${s.saves ? 'less' : 'more'}`;
}

/** Full plain-language sentence for the expanded view. */
export function fuelSavingsSentence(s: FuelSavings): string {
  return s.saves
    ? `About $${s.cad.toLocaleString()} ${DISPLAY_CURRENCY} less in fuel over 5 years than a typical new vehicle.`
    : `About $${s.cad.toLocaleString()} ${DISPLAY_CURRENCY} more in fuel over 5 years than a typical new vehicle.`;
}

export interface GhgFraming {
  score: number;
  plain: string;
}

/** GHG score is 1–10, higher = cleaner. Returns null when not on file (older records). */
export function ghgFraming(car: CarSpecs): GhgFraming | null {
  const s = car.epa?.ghgScore;
  if (s == null || s <= 0) return null;
  let plain: string;
  if (car.engine.fuelType === 'hydrogen' && car.epa?.co2 === 0) {
    plain = 'Zero tailpipe emissions from hydrogen fuel cell';
  } else if (s >= 9) plain = 'Among the cleanest-running vehicles';
  else if (s >= 7) plain = 'Cleaner-running than most new vehicles';
  else if (s >= 5) plain = 'About average tailpipe emissions';
  else if (s >= 3) plain = 'Dirtier-running than most new vehicles';
  else plain = 'Among the highest-emitting vehicles';
  return { score: s, plain };
}

/** Plain-language note for zero tailpipe CO₂ (EV / FCEV). */
export function tailpipeEmissionsNote(car: CarSpecs): string | null {
  if (car.epa?.co2 !== 0) return null;
  if (car.engine.fuelType === 'hydrogen') return 'Zero tailpipe CO₂ emissions.';
  if (car.engine.fuelType === 'electric') return 'Zero tailpipe CO₂ emissions.';
  return null;
}

export interface PhevModes {
  gasMpg?: number;
  electricMpge?: number;
  electricRangeMi?: number;
  chargeL2Hours?: number;
}

/** PHEV dual-mode economy, present only for plug-in hybrids with EPA mode data. */
export function phevModes(car: CarSpecs): PhevModes | null {
  const p = car.epa?.phev;
  if (!p) return null;
  if (p.gasMpg == null && p.electricMpge == null && p.electricRangeMi == null) return null;
  return {
    gasMpg: p.gasMpg,
    electricMpge: p.electricMpge,
    electricRangeMi: p.electricRangeMi,
    chargeL2Hours: p.chargeL2Hours,
  };
}
