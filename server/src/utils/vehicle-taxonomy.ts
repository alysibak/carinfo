import type { BodyStyle, CarSpecs } from '../types/car.types.js';

export type VehicleCategory = 'car' | 'suv' | 'truck' | 'van';

export type ShoppingSegment =
  | 'hot-hatch'
  | 'sport-compact'
  | 'sport-sedan'
  | 'muscle'
  | 'sports-car'
  | 'supercar'
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
  // Not Jaguar's S-Type R or F-Type R.
  /(?<!-)\btype r\b/,
  /\bcivic hatch/i,
  /\bveloster\b/,
  // Kia's Forte5 and Volvo's three-door C30.
  /\bforte ?5\b/,
  /\bvolvo c30\b/,
  /\bi-miev\b/,
  /\bmercedes-benz b(?:-class| ?\d{3}e?)\b/,
  /\bmazdaspeed3\b/,
  /\bfocus st\b/,
  /\bfiesta st\b/,
  /\bveloster n\b/,
  // Small cars EPA files as sedans or station wagons by interior volume.
  /\bspark\b/,
  /\bsonic 5\b/,
  /\baveo ?5\b/,
  /\belantra gt\b/,
  /\bscion xd\b/,
  /\bc-max\b/,
  /\bioniq(?! [56])\b/,
  /\bfocus (rs|electric)\b/,
  /\blancer sportback\b/,
  /\bcaliber\b/,
  /\bmatrix\b/,
  /\bbeetle\b/,
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
  /\byaris\b(?! ia)/,
  /\bfit\b/,
  /\bmirage\b(?! g4)/,
  /\bsoul\b/,
  /\bcube\b/,
  /\bprius\b(?!\s*prime)/,
];

const HOT_HATCH_PATTERN =
  /\b(gti|golf r|civic si|(?<!-)type r|focus st|fiesta st|mazdaspeed|veloster n|cooper s|mini.*\bs\b|gr corolla|i20 n|208 gti|clio rs|megane rs)\b/i;

const SPORT_SEDAN_PATTERN =
  /\b(wrx|sti|si\b|civic si|gli|elantra n|accord sport|camry trd|altima sr|model 3 performance|340i|m340|amg|c63|s4|s5|rs3|giulia)\b/i;

/**
 * Performance trims that make a sedan a sport sedan (a Challenger with the
 * same badge is a coupe, and stays muscle). Badges EPA sometimes puts in the
 * name are read from it; generic words ("GT", "SS") count only as a trim
 * derived from the engine (performance-trims.ts), so an Elantra GT hatchback
 * is not promoted.
 */
const SEDAN_BADGE_IN_NAME = /\b(r\/t|scat pack|hellcat|srt8?)\b/i;
const SEDAN_DERIVED_TRIM = /\b(ss|sho|n line|gt|r\/t|scat pack|hellcat|srt8)\b/i;

/**
 * American pony and muscle cars. With a V8 they are muscle cars; every other
 * two-door is a sports car. By horsepower alone "muscle" held 170 Porsche 911
 * Carreras, the M4, the GT-R, the LC 500 and the Corvette, America's sports car.
 */
const MUSCLE_NAMES =
  /\b(mustang|camaro|challenger|firebird|trans am|gto|monte carlo|shelby|gt ?350|gt ?500|roush|saleen)\b/i;

/** Makes whose two-doors are all sports cars ("Panoz Auto-Development", "RUF Automobile"). */
const SPORTS_CAR_MAKES =
  /^(porsche|lotus|aston martin|polestar|alpine|tvr|morgan|caterham|panoz|qvale|ruf|noble|saleen)\b/i;

/**
 * Sports cars by name, whatever their power: a Miata makes 155 hp and is a
 * sports car, an Accord Coupe makes 278 and is not. By horsepower a smart
 * fortwo was a "sports car" and a 911 Carrera S a "muscle car".
 */
const SPORTS_CAR_NAMES = new RegExp(
  '^(?:' +
    [
      'mazda (?:mx-5|miata|rx-7|rx-8)',
      'toyota (?:mr2|(?:gr )?supra|celica|(?:gr ?)?86)',
      'scion fr-s',
      'subaru brz',
      'honda (?:s2000|prelude|cr-z|crx|(?:civic )?del sol)',
      'acura (?:integra|rsx)',
      'nissan (?:\\d{3}z|z|gt-r|240sx|300zx)',
      'mitsubishi (?:eclipse|3000 ?gt)',
      'dodge (?:stealth|viper)',
      'srt viper',
      'chevrolet (?:corvette|camaro)',
      'ford (?:mustang|shelby)',
      'dodge challenger',
      'pontiac (?:firebird|solstice|fiero|gto)',
      'saturn sky',
      'chrysler crossfire',
      '(?:plymouth|chrysler) prowler',
      'eagle talon',
      'hyundai genesis coupe',
      'fiat 124 spider',
      'alfa romeo (?:4c|spider|8 ?c)',
      'mercedes-benz (?:amg )?(?:(?:sl|slk|slc)(?: ?\\d+)?|sls|slr|amg gt)',
      'bmw (?:z[348]|i8|1 series m|m coupe|m roadster)',
      'audi tt(?:s| ?rs)?',
      'jaguar (?:f-type|xk[8r]?)',
      'lexus (?:lc|rc ?f|lfa)',
      'infiniti q60 red sport',
      'cadillac (?:xlr|cts-v|ats-v)',
    ].join('|') +
    ')\\b',
);

/** Coupes of family cars: an Accord or a Solara with two doors. */
const FAMILY_COUPES =
  /^(honda (accord|civic)|nissan (altima|sentra)|toyota (camry|solara|corolla)|chrysler (sebring|200)|dodge (stratus|avenger)|chevrolet (cavalier|cobalt|monte carlo|malibu)|pontiac (sunfire|grand am|grand prix|g6)|oldsmobile (alero|intrigue)|buick|mercury cougar|hyundai (tiburon|elantra)|kia forte)\b/;

/** Makes a shopper means by "luxury": the luxury brands, the marques and the exotics. */
const LUXURY_SEARCH_MAKES = new Set([
  'Aston Martin',
  'Bentley',
  'Bugatti',
  'Ferrari',
  'Koenigsegg',
  'Lamborghini',
  'Lotus',
  'Lucid',
  'Maybach',
  'McLaren Automotive',
  'Mercedes-Maybach',
  'Pagani',
  'Polestar',
  'Rolls-Royce',
  'Tesla',
]);

export function isLuxuryBrand(make: string): boolean {
  return LUXURY_BRAND_MAKES.has(make) || LUXURY_SEARCH_MAKES.has(make);
}

/** Front-drive luxury sedans built for comfort, whatever their V6 makes. */
const COMFORT_LUXURY = /^(lexus es|lincoln (mkz|mks|zephyr)|acura (rl|rlx))\b/i;

/** Makes whose cars are luxury cars, whatever their price today. */
const LUXURY_BRAND_MAKES = new Set([
  'Acura',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Cadillac',
  'Genesis',
  'Infiniti',
  'Jaguar',
  'Land Rover',
  'Lexus',
  'Lincoln',
  'Maserati',
  'Mercedes-Benz',
  'Porsche',
  'Saab',
  'Volvo',
]);

/**
 * Factory performance badges: Audi S / RS / TT RS, BMW M. These identify a
 * performance car on their own. Relying on a horsepower figure instead let a
 * placeholder rating decide: the 2020-22 Audi S8 was a sport sedan only by
 * virtue of a bogus "999 hp", and dropping that figure made it "mainstream".
 */
const PERFORMANCE_BADGE_PATTERN = /\b(s[3-8]|rs ?[3-7]|tt ?rs|tts|m[2-8])\b/i;

/**
 * Makes whose two-doors are all supercars, and other makes' supercars. By the
 * horsepower rule a Huracán, a 488 or an R8 was a "muscle car".
 */
const SUPERCAR_MAKES = new Set([
  'Ferrari',
  'Lamborghini',
  'McLaren Automotive',
  'Bugatti',
  'Bugatti Rimac',
  'Pagani',
  'Koenigsegg',
  'Spyker',
  'Vector',
]);
const SUPERCAR_NAMES =
  /^(audi r8|acura nsx|ford gt$|porsche (carrera gt|918)|mercedes-benz (slr|sls)|lexus lfa|maserati (mc20|mcpura|gt2 stradale)|aston martin (valkyrie|valhalla))\b/;

/** Marques where every car is a luxury car. */
const LUXURY_MARQUES = new Set(['Rolls-Royce', 'Bentley', 'Maybach', 'Mercedes-Maybach']);

/**
 * Flagship luxury nameplates, by make. These make 250+ hp, so the horsepower
 * rule for sport sedans used to claim them first: a Rolls-Royce Phantom or a
 * Lexus LS was a "Sport Sedan" tagged "Enthusiast", older ones fell to
 * "mainstream" (the luxury rule keys off the estimated value), and the luxury
 * segment held 14 cars in the entire corpus.
 */
const LUXURY_FLAGSHIPS: Record<string, RegExp> = {
  // The CL is the S-Class coupe.
  'Mercedes-Benz': /^(s ?\d{3}|s-class|maybach|cl ?\d{2,3}\b)/i,
  BMW: /^(7\d\d|alpina b7)/i,
  Audi: /^a8\b/i,
  Lexus: /^ls\b/i,
  Jaguar: /^(xj|vanden plas)/i,
  Genesis: /^g90\b/i,
  // The 2009-16 Genesis sedan was the brand before it was one.
  Hyundai: /^(equus|genesis(?! coupe))\b/i,
  Kia: /^k900\b/i,
  Cadillac: /^(ct6|xts|dts|deville)\b/i,
  Lincoln: /^(continental|town car)\b/i,
  Maserati: /^(quattroporte|ghibli)\b/i,
  Volkswagen: /^phaeton\b/i,
};

function isLuxuryFlagship(car: CarSpecs, displayModel: string): boolean {
  if (LUXURY_MARQUES.has(car.make)) return true;
  return LUXURY_FLAGSHIPS[car.make]?.test(displayModel) ?? false;
}

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
    // "Si" as a word: EPA's "SIL" trim code marks the lean-burn VX and HX and
    // the 2003-05 Civic Hybrid, which read as a 201 hp "Civic Si".
    if (/\bsi\b/.test(h) && /civic/.test(h)) return 'Civic Si';
    if (/civic.*hatch|hatch.*civic/.test(h)) return 'Civic Hatchback';
  }

  if (make === 'Mini' && /\bcooper s\b/.test(h)) return 'Cooper S';
  if (make === 'Subaru' && /\bwrx\b|\bsti\b/.test(h))
    return car.model.match(/WRX|STI/i)?.[0] ?? car.model;

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
  return (
    cleaned
      .replace(/\s*\(FFV\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || model.trim()
  );
}

export function inferBodyStyle(car: CarSpecs, displayModel?: string): BodyStyle {
  const h = haystack(car);
  const model = (displayModel ?? car.model).toLowerCase();

  if (/sportwagen|sport wagen/.test(h)) return 'wagon';
  // EPA's "Countryman Coupe" is the Paceman, a two-door crossover.
  if (car.make.toLowerCase() === 'mini' && /countryman|paceman/.test(model)) return 'suv';
  // EPA files the Magnum as an SUV; it is Dodge's station wagon.
  if (/^dodge magnum\b/.test(`${car.make} ${car.model}`.toLowerCase())) return 'wagon';
  // BMW's Gran Coupes and Mercedes' "4-Door Coupe" have four doors.
  if (/\bgran coupe\b|\b(?:4|four)-door coupe\b/.test(h)) return 'sedan';
  // A GLE Coupe, a Cayenne Coupe, an Evoque Convertible or a soft-top Tracker
  // is an SUV with a car's name. The PT Cruiser is a car EPA files as a truck.
  const suvNamedLikeACar = car.bodyStyle === 'suv' && !/\bpt cruiser\b/.test(h);
  if (
    !suvNamedLikeACar &&
    /\bconvertible\b|\bcabriolet\b|\broadster\b|\bspider\b|\bspyder\b/.test(h)
  )
    return 'convertible';
  if (!suvNamedLikeACar && /\bcoupe\b/.test(h) && !/sport utility|suv/.test(h)) return 'coupe';
  if (/pickup|\bf-150\b|\bsilverado\b|\bram 1500\b|\btundra\b|\btitan\b/.test(h)) return 'truck';
  if (/sport utility|\bsuv\b|\brav4\b|\bcrv\b|\bxt\d\b|\bexplorer\b|\btahoe\b/.test(h))
    return 'suv';
  if (CROSSOVER_NAMES.test(`${car.make} ${model}`.toLowerCase())) return 'suv';
  if (/minivan|\bsienna\b|\bodyssey\b|\bpacifica\b|\bcarnival\b/.test(h)) return 'minivan';
  if (/\bvan\b|\btransit\b|\bsprinter\b|\bpromaster\b/.test(h)) return 'van';
  // "Wagon" in a name makes a car a wagon, not a van, minivan or SUV EPA filed
  // as one (Club Wagon, Windstar Wagon, Land Cruiser Wagon, and the older
  // "Outback Wagon", which split the Outback line between two body styles).
  // "Touring" is a trim name (Accord Touring, Pilot Touring, 911 GT3 Touring);
  // together these turned 261 listings into wagons.
  const epaUtility = ['suv', 'truck', 'van', 'minivan'].includes(car.bodyStyle);
  if (!epaUtility && /station wagon|\bwagon\b|\bavant\b|\bestate\b/.test(h)) return 'wagon';

  // MINI builds no sedans: the Clubman is an estate, the Countryman and
  // Paceman crossovers, the rest hatchbacks ("Hardtop 2 door", "3-doors").
  // EPA's size classes split one Countryman between "sedan" and "hatchback".
  if (car.make.toLowerCase() === 'mini' && !epaUtility) {
    if (/clubman|clubvan/.test(model)) return 'wagon';
    if (/countryman|paceman/.test(model)) return 'suv';
    return 'hatchback';
  }

  // Never over an SUV, pickup or van class: a Model Y or Kona Electric is not a hatchback.
  if (!epaUtility && HATCHBACK_PATTERNS.some((re) => re.test(h) || re.test(model)))
    return 'hatchback';

  // The first two Insights were hatchbacks; the 2019-22 car is a sedan.
  if (car.make === 'Honda' && /^insight/.test(model) && car.year < 2015) return 'hatchback';
  // "5-Door" names a hatchback whichever size class EPA used (Impreza 5-Door).
  if (car.bodyStyle === 'wagon' && FIVE_DOOR_CAR.test(model)) return 'hatchback';

  // Golf without qualifier is a hatchback (not sedan).
  if (car.make === 'Volkswagen' && /^golf$/i.test(model)) return 'hatchback';

  // EPA files cars by interior volume, so these arrive as "sedan".
  const makeModel = `${car.make} ${car.model}`.toLowerCase();
  // Roadsters in EPA's two-seater class arrive as coupes: every Boxster,
  // MX-5, S2000, Z4 and SL.
  if (car.bodyStyle === 'coupe' && CONVERTIBLE_NAMES.test(makeModel)) return 'convertible';
  if (car.bodyStyle === 'sedan') {
    const name = makeModel;
    if (FIVE_DOOR_CAR.test(name)) return 'hatchback';
    if (CONVERTIBLE_NAMES.test(name)) return 'convertible';
    if (COUPE_NAMES.test(name) || TWO_DOOR_CAR.test(name)) return 'coupe';
    // EPA's minicompact and two-seater classes are two-door cars bar a few
    // city cars: 304 Porsche 911s, every Evora and DB11 read as sedans.
    if (/^(minicompact|two seaters)/i.test(car.epa?.vClass ?? '')) {
      return CITY_HATCH.test(name) ? 'hatchback' : 'coupe';
    }
  }

  return car.bodyStyle;
}

/**
 * Two-door cars with no "coupe" in their EPA name. They read as sedans, so the
 * coupe filter missed the Mustang, Camaro and Challenger (about 800 listings)
 * and valuation priced a Mustang with a subcompact's anchor and curve.
 */
const COUPE_NAMES = new RegExp(
  [
    'mustang(?!\\s*mach-?e)',
    'camaro',
    'challenger',
    'brz',
    'gr 86',
    'fr-s',
    'toyota 86',
    'toyota supra',
    'celica',
    'prelude',
    'q60',
    'rc (?:200t|300|350|f)',
    'eclipse(?!\\s*cross)',
    'forte koup',
    'scion tc',
    '300zx',
    '3000 ?gt',
    'stealth',
    'rx-8',
    '240sx',
    'talon',
    'probe',
    'mercury cougar',
    'tiburon',
    'monte carlo',
    'lexus sc',
    'rsx',
    'firebird',
    'thunderbird',
    'paseo',
    'saturn sc',
    'clk\\d+',
    'audi tts?',
    // Before 2018 the A5 and S5 were coupes; the four-door says "Sportback".
    'audi (?:a5|s5|rs ?5)(?! sportback| cabriolet)',
    'bmw i8',
    'cadillac elr',
    // Grand tourers and halo cars filed by size class.
    'nissan gt-r',
    'bmw m2',
    'jaguar xk[8r]?',
    'lexus lc',
    'lotus evora',
    'maserati granturismo',
    'mercedes-benz (?:amg )?cl ?\\d+',
    'bentley continental (?:gt|r|t|sc|supersports)',
    'rolls-royce (?:wraith|spectre)',
    'ferrari (?:456|612|ff|gtc4lusso|roma)',
    'aston martin (?:db-?7|db9|db11|db12|dbs|v12 vanquish|vanquish|virage)',
  ]
    .map((name) => `\\b${name}\\b`)
    .join('|'),
);
/**
 * Crossovers EPA files as station wagons or cars by size class: every CR-V
 * FWD, HR-V, Juke, Murano, Niro, Mach-E, GLA, Cullinan and X1 read as a
 * wagon or sedan.
 */
const CROSSOVER_NAMES =
  /^(honda (cr-v|hr-v)|nissan (juke|rogue|murano|kicks|ariya)|kia (niro|seltos)|ford (mustang mach-e|ecosport)|mercedes-benz (amg )?gl[abc] ?\d|rolls-royce cullinan|chevrolet (trax|trailblazer)|buick (encore|envista)|infiniti (?:qx\d0|ex\d\d)|mazda cx-\d+|bmw x[1-7]\b|toyota (c-hr|venza)|subaru crosstrek|jeep (compass|renegade)|hyundai (kona|venue)|lincoln (mkc|corsair)|lexus (ux|nx) )/;

/** Convertibles EPA files as sedans, with no "convertible" in the name. */
const CONVERTIBLE_NAMES =
  /\b(volante|drophead|bentley azure|bentley continental gtc|rolls-royce (?:dawn|corniche)|maserati grancabrio|ferrari (?:california|portofino)|porsche (?:718 )?boxster|(?:amg )?sl ?\d+|slk ?\d*|slc ?\d*|\d{3}ic|mazda mx-5|miata|honda s2000|bmw z[348]|pontiac solstice|saturn sky|volkswagen eos|cadillac xlr|plymouth prowler|lexus sc ?430|volvo c70 fwd|buick cascada)\b/;
/** City cars in EPA's minicompact class: three-door hatchbacks, not coupes. */
const CITY_HATCH = /\b(fiat 500|mini|scion iq|smart|fortwo)/;
const TWO_DOOR_CAR = /\b2[ -]?dr\b|\b2[ -]door\b/;
/** "Civic 5Dr", "Mazda 3 5-Door": a five-door car is a hatchback. */
const FIVE_DOOR_CAR = /\b5[ -]?dr\b|\b5[ -]door\b/;

export function classifyShoppingSegment(
  car: CarSpecs,
  displayModel: string,
  bodyStyle: BodyStyle,
): ShoppingSegment {
  // The derived trim counts: many listings have no horsepower on file, so the
  // horsepower rule below cannot tell a Charger R/T or an Impreza STI apart.
  const h = `${displayModel} ${car.variant ?? ''} ${car.make}`.toLowerCase();
  const ft = car.engine.fuelType;
  const hp = car.engine.horsepower ?? 0;
  const disp = car.engine.displacement ?? 0;

  if (ft === 'electric' || ft === 'hydrogen') return 'ev';
  if (bodyStyle === 'truck') return 'truck';
  if (bodyStyle === 'suv' || bodyStyle === 'van' || bodyStyle === 'minivan') return 'utility';
  if (
    (bodyStyle === 'coupe' || bodyStyle === 'convertible') &&
    (SUPERCAR_MAKES.has(car.make) || SUPERCAR_NAMES.test(`${car.make} ${car.model}`.toLowerCase()))
  ) {
    return 'supercar';
  }

  const twoDoor = bodyStyle === 'coupe' || bodyStyle === 'convertible';
  // A hot-hatch badge on a sedan (Civic Si, Mazdaspeed6) makes a sport sedan,
  // and on a coupe a sport compact.
  if (
    (!twoDoor && bodyStyle !== 'sedan' && HOT_HATCH_PATTERN.test(h)) ||
    (bodyStyle === 'hatchback' && hp >= 200 && disp >= 1.8)
  )
    return 'hot-hatch';
  // Performance badges first (an S63 AMG or an Audi S8 is a sport sedan), then
  // flagships (a Phantom is not), then the horsepower rule for everything else.
  // Coupes and convertibles fall through to their own split below.
  if (
    (!twoDoor && SPORT_SEDAN_PATTERN.test(h)) ||
    ((bodyStyle === 'sedan' || bodyStyle === 'wagon') && PERFORMANCE_BADGE_PATTERN.test(h))
  )
    return 'sport-sedan';
  if (
    (bodyStyle === 'sedan' || bodyStyle === 'hatchback') &&
    (SEDAN_BADGE_IN_NAME.test(displayModel) || SEDAN_DERIVED_TRIM.test(car.variant ?? ''))
  ) {
    return 'sport-sedan';
  }
  if (isLuxuryFlagship(car, displayModel)) return 'luxury';
  // A V6 Camry, Accord, Impala or Charger makes 250-305 hp and is a family
  // sedan: 490 of them were "sport sedans". Output per litre, a turbo or a lot
  // of power tells a WRX, a Stinger or a Fusion Sport apart.
  const forced =
    car.engine.aspiration === 'turbocharged' || car.engine.aspiration === 'supercharged';
  const sporty = forced || hp >= 330 || (disp > 0 && hp / disp >= 95);
  const luxuryMake = LUXURY_BRAND_MAKES.has(car.make);
  // An IS 350, a G37 or a CTS is a sport sedan with a big V6; an ES is not.
  const luxurySport = luxuryMake && !COMFORT_LUXURY.test(`${car.make} ${displayModel}`);
  if (bodyStyle === 'sedan' && hp >= 250 && disp >= 2 && (sporty || luxurySport))
    return 'sport-sedan';
  if (twoDoor) {
    const name = `${car.make} ${displayModel}`.toLowerCase();
    if ((hp >= 400 || disp >= 4.5) && MUSCLE_NAMES.test(name)) return 'muscle';
    if (
      SPORTS_CAR_MAKES.test(car.make) ||
      SPORTS_CAR_NAMES.test(name) ||
      PERFORMANCE_BADGE_PATTERN.test(h) ||
      /\bamg\b/.test(h)
    )
      return 'sports-car';
    if (
      HOT_HATCH_PATTERN.test(h) ||
      SPORT_SEDAN_PATTERN.test(h) ||
      /\b(ss|srt-?4|type[- ]s|se-r|spec v)\b/.test(h)
    )
      return 'sport-compact';
    // A 430i, an E350 or an RC 350 coupe is a luxury car with two doors.
    if (luxuryMake) return 'luxury';
    if (hp >= 300) return 'sports-car';
    if (hp >= 180 && !FAMILY_COUPES.test(name)) return 'sport-compact';
    return 'mainstream';
  }
  // A C300, an A4 or an ES is a luxury car at any price. The rule used to key
  // off the estimated value, so older ones read "mainstream".
  if (luxuryMake) return 'luxury';
  if (bodyStyle === 'hatchback' && hp >= 150) return 'sport-compact';

  return 'mainstream';
}

function ownershipProfileFor(
  segment: ShoppingSegment,
  displayModel: string,
): OwnershipProfile | undefined {
  if (
    segment === 'hot-hatch' ||
    (segment === 'sport-compact' && /gti|si|type r|st\b|n\b/i.test(displayModel))
  ) {
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
  if (segment === 'supercar') {
    return {
      label: 'Supercar',
      tags: ['Exotic', 'Performance'],
      bestFor: ['Weekend drives', 'Track days', 'Collector appeal'],
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
    muscle: ['sports-car', 'supercar', 'luxury'],
    'sports-car': ['muscle', 'supercar', 'luxury'],
    supercar: ['sports-car', 'muscle', 'luxury'],
    luxury: ['sport-sedan', 'sports-car'],
    mainstream: ['sport-compact'],
    utility: ['truck'],
    ev: ['mainstream'],
    truck: ['utility'],
  };
  return related[a]?.includes(b) ? 0.55 : 0;
}

export function isHotHatch(car: CarSpecs, taxonomy?: VehicleTaxonomy): boolean {
  const seg =
    taxonomy?.shoppingSegment ??
    classifyShoppingSegment(car, canonicalizeDisplayModel(car), inferBodyStyle(car));
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
