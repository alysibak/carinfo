import type { BodyStyle, CarSpecs, FuelType } from '../types/car.types.js';

export type VehicleCategory = 'car' | 'suv' | 'truck' | 'van';

export type ShoppingSegment =
  | 'hot-hatch'
  | 'sport-compact'
  | 'sport-sedan'
  | 'muscle'
  | 'sports-car'
  | 'luxury'
  | 'mainstream'
  | 'utility'
  | 'ev'
  | 'truck';

export interface OwnershipProfile {
  label: string;
  tags: string[];
  bestFor: string[];
}

export interface VehicleTaxonomy {
  bodyStyle: BodyStyle;
  vehicleCategory: VehicleCategory;
  shoppingSegment: ShoppingSegment;
  displayModel: string;
  ownershipProfile?: OwnershipProfile;
}

function haystack(car: CarSpecs & { id?: string }): string {
  return `${car.make} ${car.model} ${car.trim ?? ''} ${car.id ?? ''}`.toLowerCase();
}

/** EPA often labels hatchbacks as "Compact Cars" → sedan. Correct from model/trim. */
const HATCHBACK_PATTERNS: RegExp[] = [
  /\bgti\b/,
  /\bgolf r\b/,
  /\be-golf\b/,
  /\bhatchback\b/,
  /\btype r\b/,
  /\bcivic hatch/i,
  /\bveloster\b/,
  /\bmazdaspeed3\b/,
  /\bfocus st\b/,
  /\bfiesta st\b/,
  /\belantra n\b/,
  /\bveloster n\b/,
  /\bcooper s\b/,
  /\bmini s\b/,
  /\bgr corolla\b/,
  /\bi20 n\b/,
  /\bleaf\b/,
  /\bbolt ev\b/,
  /\bbolt\b/,
  /\bi3\b/,
  /\b500e\b/,
  /\bspark ev\b/,
  /\bkona electric\b/,
  /\bniro ev\b/,
  /\bev6\b/,
  /\bioniq 5\b/,
  /\bioniq 6\b/,
  /\bmodel y\b/,
  /\byaris\b/,
  /\bfit\b/,
  /\bmirage\b/,
  /\bsoul\b/,
  /\bcube\b/,
  /\bprius\b(?!\s*prime)/,
];

const HOT_HATCH_PATTERN =
  /\b(gti|golf r|civic si|type r|focus st|fiesta st|mazdaspeed|veloster n|elantra n|cooper s|mini.*\bs\b|gr corolla|i20 n|208 gti|clio rs|megane rs)\b/i;

const SPORT_SEDAN_PATTERN =
  /\b(wrx|sti|si\b|civic si|accord sport|camry trd|altima sr|model 3 performance|340i|m340|amg|c63|s4|s5|rs3|giulia)\b/i;

function categoryFromBody(body: BodyStyle): VehicleCategory {
  if (body === 'suv' || body === 'minivan') return 'suv';
  if (body === 'truck') return 'truck';
  if (body === 'van') return 'van';
  return 'car';
}

/** Disambiguate EPA carlines that share "Golf GTI" trim slugs across unrelated configs. */
export function canonicalizeDisplayModel(car: CarSpecs): string {
  const h = haystack(car);
  const disp = car.engine.displacement ?? 0;
  const make = car.make;

  if (make === 'Volkswagen') {
    if (/sportwagen|sport wagen/.test(h)) return 'Golf SportWagen';
    if (/e-golf|e golf/.test(h)) return 'e-Golf';
    if (/golf r|\bgolf-r\b/.test(h)) return 'Golf R';
    if (/\bgti\b|golf-gti/.test(h)) {
      // EPA groups base 1.8L Golfs under golf-gti trim slugs — not a GTI.
      if (disp >= 1.95) return 'Golf GTI';
      return 'Golf';
    }
  }

  if (make === 'Honda') {
    if (/civic.*type r|type r.*civic/.test(h)) return 'Civic Type R';
    if (/civic.*si|\bsi\b/.test(h) && /civic/.test(h)) return 'Civic Si';
    if (/civic.*hatch|hatch.*civic/.test(h)) return 'Civic Hatchback';
  }

  if (make === 'Mini' && /\bcooper s\b/.test(h)) return 'Cooper S';
  if (make === 'Subaru' && /\bwrx\b|\bsti\b/.test(h)) return car.model.match(/WRX|STI/i)?.[0] ?? car.model;

  return stripEpaModelNoise(car.model.trim());
}

const EPA_MODEL_PAREN =
  /\s*\([^)]*(?:energy\s+capacity|(?:\d+\s*)?ah\b|ffv|flex[- ]?fuel|ethanol|gas\s+guzzler|tier\s*\d|bin\s*\d|\d+\s*dr\b)[^)]*\)/gi;

const TECHNICAL_PAREN = /\s*\([^)]*\d+\s*(?:ah|kw|kwh|mi|mpg|cc|hp|lb)[^)]*\)/gi;

function stripEpaModelNoise(model: string): string {
  let cleaned = model.trim();
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(EPA_MODEL_PAREN, '').replace(TECHNICAL_PAREN, '').trim();
  }
  return cleaned.replace(/\s*\(FFV\)/gi, '').replace(/\s{2,}/g, ' ').trim() || model.trim();
}

export function inferBodyStyle(car: CarSpecs, displayModel?: string): BodyStyle {
  const h = haystack(car);
  const model = (displayModel ?? car.model).toLowerCase();

  if (/sportwagen|sport wagen/.test(h)) return 'wagon';
  if (/\bconvertible\b|\bcabriolet\b|\broadster\b|\bspider\b|\bspyder\b/.test(h)) return 'convertible';
  if (/\bcoupe\b/.test(h) && !/sport utility|suv/.test(h)) return 'coupe';
  if (/pickup|\bf-150\b|\bsilverado\b|\bram 1500\b|\btundra\b|\btitan\b/.test(h)) return 'truck';
  if (/sport utility|\bsuv\b|\brav4\b|\bcrv\b|\bxt\d\b|\bexplorer\b|\btahoe\b/.test(h)) return 'suv';
  if (/minivan|\bsienna\b|\bodyssey\b|\bpacifica\b|\bcarnival\b/.test(h)) return 'minivan';
  if (/\bvan\b|\btransit\b|\bsprinter\b|\bpromaster\b/.test(h)) return 'van';
  if (/station wagon|\bwagon\b|\bavant\b|\btouring\b|\bestate\b/.test(h)) return 'wagon';

  if (HATCHBACK_PATTERNS.some((re) => re.test(h) || re.test(model))) return 'hatchback';

  // Golf without qualifier is a hatchback (not sedan).
  if (car.make === 'Volkswagen' && /^golf$/i.test(model)) return 'hatchback';

  return car.bodyStyle;
}

export function classifyShoppingSegment(car: CarSpecs, displayModel: string, bodyStyle: BodyStyle): ShoppingSegment {
  const h = `${displayModel} ${car.make}`.toLowerCase();
  const ft = car.engine.fuelType;
  const hp = car.engine.horsepower ?? 0;
  const disp = car.engine.displacement ?? 0;

  if (ft === 'electric' || ft === 'hydrogen') return 'ev';
  if (bodyStyle === 'truck') return 'truck';
  if (bodyStyle === 'suv' || bodyStyle === 'van' || bodyStyle === 'minivan') return 'utility';

  if (HOT_HATCH_PATTERN.test(h) || (bodyStyle === 'hatchback' && hp >= 200 && disp >= 1.8)) return 'hot-hatch';
  if (SPORT_SEDAN_PATTERN.test(h) || (bodyStyle === 'sedan' && hp >= 250 && disp >= 2)) return 'sport-sedan';
  if (bodyStyle === 'coupe' || bodyStyle === 'convertible') {
    if (hp >= 400 || disp >= 5) return 'muscle';
    return 'sports-car';
  }
  if (['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Genesis', 'Infiniti', 'Acura'].includes(car.make) && (car.price?.msrp ?? 0) > 55000) {
    return 'luxury';
  }
  if (bodyStyle === 'hatchback' && hp >= 150) return 'sport-compact';

  return 'mainstream';
}

function ownershipProfileFor(segment: ShoppingSegment, displayModel: string): OwnershipProfile | undefined {
  if (segment === 'hot-hatch' || (segment === 'sport-compact' && /gti|si|type r|st\b|n\b/i.test(displayModel))) {
    return {
      label: 'Sport Compact',
      tags: ['Daily Driver', 'Enthusiast Favorite'],
      bestFor: ['Fun commuting', 'Manual enthusiasts', 'Affordable performance'],
    };
  }
  if (segment === 'sport-sedan') {
    return {
      label: 'Sport Sedan',
      tags: ['All-weather capable', 'Enthusiast'],
      bestFor: ['Year-round performance', 'Back-seat practicality', 'Weekend drives'],
    };
  }
  if (segment === 'sports-car' || segment === 'muscle') {
    return {
      label: segment === 'muscle' ? 'Muscle Car' : 'Sports Car',
      tags: ['Weekend warrior', 'Performance'],
      bestFor: ['Open-road driving', 'Track days', 'Collector appeal'],
    };
  }
  return undefined;
}

export function resolveVehicleTaxonomy(car: CarSpecs): VehicleTaxonomy {
  const displayModel = canonicalizeDisplayModel(car);
  const bodyStyle = inferBodyStyle(car, displayModel);
  const vehicleCategory = categoryFromBody(bodyStyle);
  const shoppingSegment = classifyShoppingSegment(car, displayModel, bodyStyle);
  const ownershipProfile = ownershipProfileFor(shoppingSegment, displayModel);

  return { bodyStyle, vehicleCategory, shoppingSegment, displayModel, ownershipProfile };
}

/** Segment affinity for cross-shopping — higher = closer competitor. */
export function segmentAffinity(a: ShoppingSegment, b: ShoppingSegment): number {
  if (a === b) return 1;
  const related: Record<ShoppingSegment, ShoppingSegment[]> = {
    'hot-hatch': ['sport-compact', 'sport-sedan'],
    'sport-compact': ['hot-hatch', 'mainstream'],
    'sport-sedan': ['hot-hatch', 'sport-compact', 'luxury'],
    muscle: ['sports-car', 'luxury'],
    'sports-car': ['muscle', 'luxury'],
    luxury: ['sport-sedan', 'sports-car'],
    mainstream: ['sport-compact'],
    utility: ['truck'],
    ev: ['mainstream'],
    truck: ['utility'],
  };
  return related[a]?.includes(b) ? 0.55 : 0;
}

export function isHotHatch(car: CarSpecs, taxonomy?: VehicleTaxonomy): boolean {
  const seg = taxonomy?.shoppingSegment ?? classifyShoppingSegment(car, canonicalizeDisplayModel(car), inferBodyStyle(car));
  return seg === 'hot-hatch' || seg === 'sport-compact';
}

/** NHTSA keys to try when exact make|model|year is missing. */
export function nhtsaLookupKeys(car: CarSpecs, displayModel?: string): string[] {
  const model = displayModel ?? canonicalizeDisplayModel(car);
  const keys = new Set<string>();

  const add = (m: string, y: number) => {
    if (m && y >= 1990) keys.add(`${car.make}|${m}|${y}`);
  };

  for (const y of [car.year, car.year - 1, car.year + 1, car.year - 2, car.year + 2]) {
    add(car.model, y);
    add(model, y);
    const firstModel = model.split(/[\s-/]/)[0];
    const firstRaw = car.model.split(/[\s-/]/)[0];
    if (firstModel && firstModel.length >= 2) {
      add(firstModel, y);
      add(firstModel.charAt(0).toUpperCase() + firstModel.slice(1).toLowerCase(), y);
    }
    if (firstRaw && firstRaw !== firstModel) add(firstRaw, y);
  }

  if (car.make === 'Volkswagen') {
    if (/gti|golf/i.test(model)) {
      for (const y of [car.year, car.year - 1, car.year + 1]) {
        add('Golf', y);
        add('GTI', y);
      }
    }
    if (/jetta|passat|cc|eos|beetle/i.test(model)) {
      add(model.split(' ')[0], car.year);
    }
  }

  if (/civic/i.test(model)) add('Civic', car.year);
  if (/cooper/i.test(model)) add('Cooper', car.year);

  return Array.from(keys);
}

export interface NhtsaSafetyRating {
  overall: number;
  frontal?: number;
  side?: number;
  rollover?: number;
}

function normalizeNhtsaModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** True when an EPA model label plausibly matches an NHTSA model name. */
function nhtsaModelsMatch(epaModel: string, cacheModel: string): boolean {
  const a = normalizeNhtsaModel(epaModel);
  const b = normalizeNhtsaModel(cacheModel);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const af = a.match(/^[a-z0-9]+/)?.[0] ?? '';
  const bf = b.match(/^[a-z0-9]+/)?.[0] ?? '';
  return af.length >= 3 && af === bf;
}

/**
 * Resolve NHTSA star ratings for an EPA configuration by trying exact keys,
 * nearby model years, and fuzzy model-name matches against the safety index.
 */
export function resolveNhtsaSafety(
  car: CarSpecs,
  safetyIndex: Record<string, NhtsaSafetyRating>,
  displayModel?: string,
): NhtsaSafetyRating | undefined {
  for (const key of nhtsaLookupKeys(car, displayModel)) {
    const hit = safetyIndex[key];
    if (hit?.overall) return hit;
  }

  const model = displayModel ?? canonicalizeDisplayModel(car);
  for (const year of [car.year, car.year - 1, car.year + 1, car.year - 2, car.year + 2]) {
    const prefix = `${car.make}|`;
    const suffix = `|${year}`;
    for (const [key, rating] of Object.entries(safetyIndex)) {
      if (!rating.overall) continue;
      if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
      const cacheModel = key.slice(prefix.length, key.length - suffix.length);
      if (nhtsaModelsMatch(model, cacheModel) || nhtsaModelsMatch(car.model, cacheModel)) {
        return rating;
      }
    }
  }

  return undefined;
}

/**
 * Resolve country of origin from the NHTSA enrichment cache when a make|model|year
 * entry carries countryOfOrigin (same key scheme as safety ratings).
 * Direct key lookup only — fuzzy scan over the full index is too slow at load time.
 */
export function resolveNhtsaCountry(
  car: CarSpecs,
  countryIndex: Record<string, string>,
  displayModel?: string,
): string | undefined {
  for (const key of nhtsaLookupKeys(car, displayModel)) {
    const hit = countryIndex[key];
    if (hit) return hit;
  }
  return undefined;
}
