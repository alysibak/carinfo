import type { CarSpecs } from '../types/car.types.js';

type TransmissionInfo = CarSpecs['transmission'];
type ListingCar = Pick<CarSpecs, 'trim' | 'model' | 'transmission'>;

/** EPA / slug tokens that are not consumer-facing trim names. */
const TRIM_NOISE = new Set([
  'automatic', 'manual', 'auto', 'cvt', 'spd', 'mode', 'clkup', 'av', 'at', 'mt',
  's6', 's7', 's8', 's10', 'am', 'pm', 'sil', 'ems', 'dct', 'pdk', 'tiptronic',
  '4wd', '2wd', 'awd', 'fwd', 'rwd', '4x4', '2x4',
]);

/** Meaningful short trim tokens — do not strip even if ≤4 chars. */
const MEANINGFUL_SHORT = new Set([
  'gti', 'gt', 'rs', 'se', 'le', 'ex', 'lx', 'si', 'xse', 'xle', 'sr', 'trd', 'gr',
  'st', 'rt', 'ss', 'rs', 'svt', 'sho', 'sti', 'type', 'r', 's', 'm',
]);

function titleToken(token: string): string {
  const lower = token.toLowerCase();
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

/**
 * Canonical human-readable trim for hero/cards — never raw slugs or transmission codes.
 */
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
  const meaningful = tokens.filter((t) => {
    const lower = t.toLowerCase();
    if (TRIM_NOISE.has(lower)) return false;
    if (/^s\d+$/.test(lower)) return false;
    if (/^\d+spd$/.test(lower)) return false;
    if (modelTokens.has(lower)) return false;
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

function isPlausibleSpeedCount(n: number): boolean {
  return Number.isFinite(n) && n >= 1 && n <= 12;
}

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

export const displayTransmissionLabel = formatTransmissionLabel;

export function displayListingSubtitle(car: ListingCar): string | null {
  const trim = displayTrimLabel(car);
  if (trim) return trim;

  if (car.transmission?.type) {
    return formatTransmissionLabel(car.transmission);
  }

  return null;
}
