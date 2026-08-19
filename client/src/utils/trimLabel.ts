import type { CarSpecs } from '../types/car.types';

type TransmissionInfo = CarSpecs['transmission'];
type ListingCar = Pick<CarSpecs, 'trim' | 'model' | 'transmission'>;
type ModelCar = Pick<CarSpecs, 'make' | 'model' | 'trim' | 'engine'>;

/** EPA parenthetical annotations that are not consumer-facing model names. */
const EPA_MODEL_PAREN =
  /\s*\([^)]*(?:energy\s+capacity|(?:\d+\s*)?ah\b|ffv|flex[- ]?fuel|ethanol|gas\s+guzzler|tier\s*\d|bin\s*\d|\d+\s*dr\b)[^)]*\)/gi;

/** Technical parentheticals with measured units (kW, kWh, mi, etc.). */
const TECHNICAL_PAREN = /\s*\([^)]*\d+\s*(?:ah|kw|kwh|mi|mpg|cc|hp|lb)[^)]*\)/gi;

const EPA_MODEL_SUFFIX = /\s+(?:FFV|4WD|AWD|FWD|RWD|2WD|4\s*Dr|2\s*Dr|5\s*Dr)\s*$/i;

function stripEpaModelNoise(model: string): string {
  let cleaned = model.trim();
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(EPA_MODEL_PAREN, '').replace(TECHNICAL_PAREN, '').trim();
  }
  cleaned = cleaned.replace(/\s*\(FFV\)/gi, '').replace(EPA_MODEL_SUFFIX, '').trim();
  return cleaned.replace(/\s{2,}/g, ' ');
}

/** Lightweight client mirror of server canonicalizeDisplayModel for common disambiguations. */
function clientCanonicalizeModel(car: ModelCar): string {
  const h = `${car.make} ${car.model} ${car.trim ?? ''}`.toLowerCase();
  const disp = car.engine?.displacement ?? 0;

  if (car.make === 'Volkswagen') {
    if (/sportwagen|sport wagen/.test(h)) return 'Golf SportWagen';
    if (/e-golf|e golf/.test(h)) return 'e-Golf';
    if (/golf r|\bgolf-r\b/.test(h)) return 'Golf R';
    if (/\bgti\b|golf-gti/.test(h)) return disp >= 1.95 ? 'Golf GTI' : 'Golf';
  }
  if (car.make === 'Honda') {
    if (/civic.*type r|type r.*civic/.test(h)) return 'Civic Type R';
    if (/civic.*si|\bsi\b/.test(h) && /civic/.test(h)) return 'Civic Si';
    if (/civic.*hatch|hatch.*civic/.test(h)) return 'Civic Hatchback';
  }
  if (car.make === 'Mini' && /\bcooper s\b/.test(h)) return 'Cooper S';
  if (car.make === 'Subaru' && /\bwrx\b|\bsti\b/.test(h)) {
    return car.model.match(/WRX|STI/i)?.[0] ?? car.model;
  }

  return car.model.trim();
}

/**
 * Canonical human-readable model name — strips EPA technical annotations
 * (e.g. "bZ (energy capacity 200 Ah)" → "bZ") and applies common disambiguation.
 */
export function displayModelLabel(car: ModelCar): string {
  const base = clientCanonicalizeModel(car);
  const cleaned = stripEpaModelNoise(base);
  return cleaned || base || car.model.trim();
}

/** EPA / slug tokens that are not consumer-facing trim names. */
const TRIM_NOISE = new Set([
  'automatic', 'manual', 'auto', 'cvt', 'spd', 'mode', 'clkup', 'av', 'at', 'mt',
  's6', 's7', 's8', 's10', 'pm', 'sil', 'ems', 'dct', 'pdk', 'tiptronic',
  '4wd', '2wd', 'awd', 'fwd', 'rwd', '4x4', '2x4',
  'cmode', 'vmode', 'lkup', 'variable', 'gear', 'ratios', 'lockup', 'creeper',
]);

/**
 * EPA transmission codes that survive tokenization: lock-up/shift-mode markers
 * ("2mode", "3mode", "2lkup") and automated-manual gear counts ("am6", "am7").
 */
const TRIM_NOISE_PATTERNS = [/^[a-z]{0,2}\d*(?:mode|lkup)$/, /^am\d+$/, /^s\d+$/, /^\d+spd$/];

/**
 * Model-family and body words. As a trim they either repeat the model name
 * ("Golf" on a Golf GTI, "3 Series" on a 318i) or duplicate the body style
 * already shown beside the label, so they carry nothing on their own.
 */
const GENERIC_MODEL_WORDS = new Set([
  'series', 'class', 'pickup', 'golf', 'wagon', 'sedan', 'coupe', 'van',
  'truck', 'convertible', 'hatchback', 'roadster',
]);

/** Short tokens that are ordinary words, not model codes — "John", not "JOHN". */
const TITLE_CASE_WORDS = new Set(['john', 'am', 'can']);

const MEANINGFUL_SHORT = new Set([
  'gti', 'gt', 'rs', 'se', 'le', 'ex', 'lx', 'si', 'xse', 'xle', 'sr', 'trd', 'gr',
  'st', 'rt', 'ss', 'svt', 'sho', 'sti', 'type', 'r', 's', 'm',
]);

function titleToken(token: string): string {
  const lower = token.toLowerCase();
  if (TITLE_CASE_WORDS.has(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  if (MEANINGFUL_SHORT.has(lower)) {
    if (lower.length === 1) return lower.toUpperCase();
    return lower.toUpperCase();
  }
  if (/^\d/.test(token)) return token.toUpperCase();
  if (token.length <= 4) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function isInternalSlug(trim: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(trim);
}

/** Canonical human-readable trim — hides EPA slugs and transmission codes. */
export function displayTrimLabel(car: Pick<CarSpecs, 'trim' | 'model'>): string | null {
  const { trim, model } = car;
  if (!trim || trim === 'base') return null;

  if (!isInternalSlug(trim)) {
    const cleaned = trim.trim();
    if (/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(cleaned)) return null;
    return cleaned;
  }

  const modelSlug = model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let rest = trim;
  if (rest.startsWith(`${modelSlug}-`)) rest = rest.slice(modelSlug.length + 1);
  else if (rest === modelSlug) return null;

  const modelTokens = new Set(model.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const tokens = rest.split('-').filter(Boolean);
  const meaningful = tokens.filter((t, i) => {
    const lower = t.toLowerCase();
    // EPA automated-manual code reads "automatic-am-s7"; a bare "am" anywhere
    // else is part of a real name (Trans Am, Grand Am, Can-Am).
    if (lower === 'am') return tokens[i - 1]?.toLowerCase() !== 'automatic';
    if (TRIM_NOISE.has(lower)) return false;
    if (TRIM_NOISE_PATTERNS.some((re) => re.test(lower))) return false;
    if (GENERIC_MODEL_WORDS.has(lower)) return false;
    if (modelTokens.has(lower)) return false;
    // "M" against model "M3", "SL" against "SL320" — the model already says it.
    if (lower.length <= 2 && [...modelTokens].some((mt) => mt.startsWith(lower))) return false;
    if (lower.length <= 2 && !MEANINGFUL_SHORT.has(lower)) return false;
    return true;
  });

  if (meaningful.length === 0) return null;

  return meaningful.map(titleToken).join(' ');
}

const TRANSMISSION_TYPE_LABELS: Record<TransmissionInfo['type'], string> = {
  manual: 'Manual',
  automatic: 'Automatic',
  cvt: 'CVT',
  'dual-clutch': 'Dual-clutch',
};

/** Valid passenger-car gear counts only — never parse model names like S90. */
function isPlausibleSpeedCount(n: number): boolean {
  return Number.isFinite(n) && n >= 1 && n <= 12;
}

/**
 * Speed count from transmission.speeds or EPA description codes (AV-S6, S8, 6-spd).
 * Never from trim slugs — avoids "S90" → 90-Speed Automatic.
 */
function parseEpaTransmissionSpeeds(
  speeds?: number | null,
  description?: string,
): number | undefined {
  if (speeds != null && isPlausibleSpeedCount(speeds)) return speeds;

  if (!description) return undefined;
  const d = description.trim();

  const avMatch = d.match(/(?:AV|AM)-S(\d+)/i);
  if (avMatch && isPlausibleSpeedCount(Number(avMatch[1]))) return Number(avMatch[1]);

  const parenS = d.match(/\(S(\d+)\)/i);
  if (parenS && isPlausibleSpeedCount(Number(parenS[1]))) return Number(parenS[1]);

  const spdMatch = d.match(/(\d+)[- ]?spd/i);
  if (spdMatch && isPlausibleSpeedCount(Number(spdMatch[1]))) return Number(spdMatch[1]);

  return undefined;
}

function isCvtDescription(description?: string, type?: TransmissionInfo['type']): boolean {
  if (type === 'cvt') return true;
  if (!description) return false;
  const d = description.toLowerCase();
  if (d.includes('cvt')) return true;
  if (d.includes('variable') && !/(?:av|am)-s\d+/i.test(description)) return true;
  if (d.includes('variable gear')) return true;
  return false;
}

/** Human-readable transmission — e.g. "6-Speed Automatic", "CVT". */
export function formatTransmissionLabel(
  trans: Pick<TransmissionInfo, 'type' | 'speeds' | 'description'>,
  _trim?: string,
): string {
  if (isCvtDescription(trans.description, trans.type)) return 'CVT';

  const type = TRANSMISSION_TYPE_LABELS[trans.type] ?? 'Automatic';
  const speeds = parseEpaTransmissionSpeeds(trans.speeds, trans.description);

  if (speeds && trans.type !== 'cvt') return `${speeds}-Speed ${type}`;
  return type;
}

/** Alias used across the UI — single normalization entry point. */
export const displayTransmissionLabel = formatTransmissionLabel;

/**
 * Line under the model name in lists/cards. Uses trim when readable; otherwise
 * surfaces transmission so same-year/model variants are distinguishable.
 */
export function displayListingSubtitle(car: ListingCar): string | null {
  const trim = displayTrimLabel(car);
  if (trim) return trim;

  if (car.transmission?.type) {
    return formatTransmissionLabel(car.transmission);
  }

  return null;
}
