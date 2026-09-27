import type { Car } from '../types/car.types.js';

/**
 * Manufacturer ratings for best-selling engines the EPA Test Car List match
 * got wrong. The committed horsepower file predates the matcher's fixes (see
 * README) and borrowed ratings across engines: every 2017–22 CR-V turbo at
 * the CR-V Hybrid's 143 hp engine rating (the car makes 190), every 2019+
 * Mazda 2.5 at 207 (186–191), Hyundai and Kia's 2.5 at 236–241 (191), the
 * STI at the WRX's 268 (305–310), the Grand Cherokee EcoDiesel at 172 (240),
 * the Bronco Sport Sasquatch at 91 (181). Each row is one engine in one span
 * of model years; a hybrid matches only a row for hybrids (rated as a
 * system), and plug-ins never match.
 */
interface Correction {
  make: string;
  model: RegExp;
  years: [number, number];
  litres: number;
  forced: boolean;
  fuel?: 'gasoline' | 'diesel' | 'hybrid';
  hp: number;
  /** The derived trim, where it tells engines of one size apart (a Civic Si). */
  variant?: RegExp;
  /** The engine is naturally aspirated whatever EPA's turbo flag says. */
  naturallyAspirated?: boolean;
}

const row = (
  make: string,
  model: RegExp,
  years: [number, number],
  litres: number,
  forced: boolean,
  hp: number,
  fuel: 'gasoline' | 'diesel' | 'hybrid' = 'gasoline',
): Correction => ({ make, model, years, litres, forced, fuel, hp });

const CORRECTIONS: Correction[] = [
  // The Si's 1.5 turbo read the Civic's 174 hp or 190 (it makes 205, 200 from 2022).
  { ...row('Honda', /^Civic/, [2017, 2021], 1.5, true, 205), variant: /^Si$/ },
  { ...row('Honda', /^Civic/, [2022, 2026], 1.5, true, 200), variant: /^Si$/ },
  // The F-150's naturally aspirated engines read the EcoBoost's or the
  // Raptor R's figures (a 5.0 at 600-653 hp).
  row('Ford', /^F-?150(?! (Raptor|Lightning))/, [2011, 2014], 5, false, 360),
  row('Ford', /^F-?150(?! (Raptor|Lightning))/, [2015, 2017], 5, false, 385),
  row('Ford', /^F-?150(?! (Raptor|Lightning))/, [2018, 2020], 5, false, 395),
  row('Ford', /^F-?150(?! (Raptor|Lightning))/, [2021, 2026], 5, false, 400),
  row('Ford', /^F-?150(?! (Raptor|Lightning))/, [2015, 2017], 3.5, false, 282),
  row('Chevrolet', /^Silverado/, [2014, 2021], 4.3, false, 285),
  row('GMC', /^Sierra/, [2014, 2021], 4.3, false, 285),
  // The Hurricane six: 420 hp as standard, 540 as the HO in the RHO.
  row('Ram', /^1500(?! (HO|RHO|TRX))/, [2025, 2026], 3, true, 420),
  // The TRX made 702 hp (not the Hellcats' 707); the 2026 car, filed as a
  // plain "1500 4WD", makes 777.
  row('Ram', /^1500/, [2021, 2024], 6.2, true, 702),
  row('Ram', /^1500/, [2026, 2026], 6.2, true, 777),
  // The Pentastar V6 and the 5.7 Hemi, rated 305 and 395 hp throughout: the
  // match gave the V6 240 (the EcoDiesel's), 290 or 298 by year, and the Hemi
  // 390 or 393.
  row('Ram', /^1500(?! (TRX|HO|RHO))/, [2013, 2026], 3.6, false, 305),
  row('Ram', /^1500(?! (TRX|HO|RHO))/, [2013, 2026], 5.7, false, 395),
  row('Ram', /^1500/, [2014, 2018], 3, true, 240, 'diesel'),
  row('Ram', /^1500/, [2020, 2023], 3, true, 260, 'diesel'),
  // The test-car match lumped the Golf, GTI and Jetta: a 2000 GTI 1.8T at the
  // eight-valve 2.0's 115 hp (it made 150), a 2002 Golf TDI at 115 (90).
  row('Volkswagen', /^Golf GTI$/, [2000, 2001], 1.8, true, 150),
  row('Volkswagen', /^Golf GTI$/, [2002, 2006], 1.8, true, 180),
  row('Volkswagen', /^Golf$/, [1996, 2003], 1.9, true, 90, 'diesel'),
  row('Volkswagen', /^Golf$/, [2004, 2006], 1.9, true, 100, 'diesel'),
  row('Nissan', /^Kicks/, [2018, 2019], 1.6, false, 125),
  row('Honda', /^CR-V(?! (Hybrid|e-FCEV))/, [2017, 2022], 1.5, true, 190),
  row('Honda', /^Civic(?! (Hybrid|Natural Gas|Type R))/, [2016, 2024], 2, false, 158),
  row('Honda', /^Civic(?! (Hybrid|Natural Gas|Type R))/, [2025, 2027], 2, false, 150),
  row('Chevrolet', /^Blazer (FWD|AWD)/, [2019, 2022], 2, true, 230),
  row('Chevrolet', /^Blazer (FWD|AWD)/, [2023, 2026], 2, true, 228),
  row('Ford', /^Bronco Sport/, [2021, 2024], 1.5, true, 181),
  row('Ford', /^Bronco Sport/, [2025, 2027], 1.5, true, 180),
  row('Ford', /^Explorer(?! (HEV|Platinum HEV|Sport Trac))/, [2016, 2019], 2.3, true, 280),
  row('Ford', /^Explorer(?! (HEV|Platinum HEV|Sport Trac))/, [2020, 2025], 2.3, true, 300),
  row('Ford', /^Explorer(?! (HEV|Platinum HEV|Sport Trac))/, [2011, 2019], 3.5, false, 290),
  row('Ford', /^Edge/, [2015, 2018], 3.5, false, 280),
  row('Hyundai', /^Sonata(?! (Hybrid|Plug-in))/, [2020, 2026], 2.5, false, 191),
  row('Hyundai', /^Sonata(?! (Hybrid|Plug-in))/, [2021, 2025], 2.5, true, 290),
  row('Hyundai', /^Santa Fe(?! (Hybrid|Plug-in|Sport|XL))/, [2021, 2023], 2.5, false, 191),
  row('Hyundai', /^Elantra(?! (GT|N|Coupe|Hybrid))/, [2017, 2026], 2, false, 147),
  row('Hyundai', /^Santa Cruz/, [2022, 2026], 2.5, false, 191),
  row('Hyundai', /^Santa Cruz/, [2022, 2026], 2.5, true, 281),
  row('Kia', /^Sorento(?! (Hybrid|Plug-in))/, [2021, 2026], 2.5, false, 191),
  row('Kia', /^K5/, [2021, 2026], 2.5, false, 191),
  row('Kia', /^Soul(?! (Electric|EV))/, [2014, 2019], 1.6, false, 130),
  row('Mazda', /^3 /, [2014, 2018], 2.5, false, 184),
  row('Mazda', /^3 /, [2019, 2020], 2.5, false, 186),
  row('Mazda', /^3 /, [2021, 2026], 2.5, false, 191),
  row('Mazda', /^3 /, [2019, 2026], 2, false, 155),
  row('Mazda', /^CX-30/, [2020, 2020], 2.5, false, 186),
  row('Mazda', /^CX-30/, [2021, 2026], 2.5, false, 191),
  row('Mazda', /^CX-5(?!0)/, [2017, 2026], 2.5, false, 187),
  row('Mazda', /^CX-50/, [2023, 2026], 2.5, false, 187),
  row('Mazda', /^CX-50/, [2023, 2026], 2.5, true, 227),
  row('Mazda', /^6\b/, [2018, 2021], 2.5, false, 187),
  // Luxury engines the output check leaves alone: a 2025 Escalade's 6.2 read
  // the Escalade-V's 675, an IS 350 232, an ES 250 181.
  row('Cadillac', /^Escalade(?! V)/, [2015, 2026], 6.2, false, 420),
  row('Lexus', /^IS 350/, [2014, 2020], 3.5, false, 306),
  row('Lexus', /^IS 350/, [2021, 2026], 3.5, false, 311),
  row('Lexus', /^IS 300/, [2016, 2020], 3.5, false, 255),
  row('Lexus', /^IS 300/, [2021, 2026], 3.5, false, 260),
  row('Lexus', /^ES 250/, [2021, 2026], 2.5, false, 203),
  row('Audi', /^Q5/, [2013, 2017], 3, true, 272),
  // A 2020 S8 took the 2017-18 S8 plus's 605 hp; the 2024 530i the old
  // generation's 248.
  row('Audi', /^S8/, [2020, 2027], 4, true, 563),
  row('BMW', /^530i/, [2024, 2027], 2, true, 255),
  row('Audi', /^Q5/, [2014, 2016], 3, true, 240, 'diesel'),
  // The 2.0-litre turbo NX 200t and NX 300, which read 112 hp.
  row('Lexus', /^NX (200t|300)(?!h)/, [2015, 2021], 2, true, 235),
  // EPA files the 2.5-litre STI as "WRX".
  row('Subaru', /^WRX/, [2015, 2018], 2.5, true, 305),
  row('Subaru', /^WRX/, [2019, 2021], 2.5, true, 310),
  row('Jeep', /^Grand Cherokee WK/, [2011, 2022], 5.7, false, 360),
  row('Jeep', /^Grand Cherokee L/, [2021, 2023], 5.7, false, 357),
  row('Jeep', /^Grand Cherokee(?! (SRT|Track|WK))/, [2011, 2021], 5.7, false, 360),
  row('Jeep', /^Grand Cherokee(?! (SRT|Track|WK|4xe))/, [2022, 2023], 5.7, false, 357),
  row('Jeep', /^Grand Cherokee/, [2014, 2019], 3, true, 240, 'diesel'),
  // GM's full-size trucks and SUVs, which the match left without a figure:
  // the 5.3 and 6.2 V8s (355 and 420 hp), the 2.7 turbo (310) and the 3.0
  // Duramax (277, then 305 from its 2023 update).
  ...['Silverado', 'Sierra'].flatMap((name) => {
    const make = name === 'Silverado' ? 'Chevrolet' : 'GMC';
    const model = new RegExp(`^${name}`);
    return [
      row(make, model, [2019, 2026], 5.3, false, 355),
      row(make, model, [2019, 2026], 6.2, false, 420),
      row(make, model, [2019, 2020], 2.7, true, 310),
      row(make, model, [2020, 2022], 3, true, 277, 'diesel'),
      row(make, model, [2023, 2026], 3, true, 305, 'diesel'),
    ];
  }),
  ...[
    ['Chevrolet', /^(Tahoe|Suburban)/],
    ['GMC', /^Yukon/],
  ].flatMap(([make, model]) => [
    row(make as string, model as RegExp, [2015, 2026], 5.3, false, 355),
    row(make as string, model as RegExp, [2015, 2026], 6.2, false, 420),
    // The SUVs took the 305 hp diesel with the 2025 update.
    row(make as string, model as RegExp, [2021, 2024], 3, true, 277, 'diesel'),
    row(make as string, model as RegExp, [2025, 2026], 3, true, 305, 'diesel'),
  ]),
  // The midsize pickups' 3.6 V6 (305 hp, 308 from 2017) and 2.8 Duramax (181).
  ...[
    ['Chevrolet', /^Colorado/],
    ['GMC', /^Canyon/],
  ].flatMap(([make, model]) => [
    row(make as string, model as RegExp, [2015, 2016], 3.6, false, 305),
    row(make as string, model as RegExp, [2017, 2022], 3.6, false, 308),
    row(make as string, model as RegExp, [2016, 2022], 2.8, true, 181, 'diesel'),
  ]),
  row('Ford', /^F-?150/, [2018, 2021], 3, true, 250, 'diesel'),
  row('Ford', /^Ranger/, [2019, 2023], 2.3, true, 270),
  row('Ford', /^Ranger(?! Raptor)/, [2024, 2026], 2.7, true, 315),
  row('Toyota', /^Tacoma/, [2016, 2023], 2.7, false, 159),
  // Porsche's 718, by trim: the 2.0 turbo base car and T (300 hp) read the
  // GTS's 361, the 2023 GT4 the GT4 RS's 493, and EPA flags some of the
  // naturally aspirated 4.0s as turbocharged.
  ...[false, true].flatMap((forced) =>
    [
      row('Porsche', /^718 (?:Boxster|Cayman) GTS$/, [2020, 2025], 4, forced, 394),
      row('Porsche', /^718 (?:Cayman GT4|Spyder)$/, [2020, 2025], 4, forced, 414),
      row('Porsche', /^718 (?:GT4 RS|Spyder RS)$/, [2022, 2025], 4, forced, 493),
    ].map((r) => ({ ...r, naturallyAspirated: true })),
  ),
  row('Porsche', /^(?:718 )?(?:Boxster|Cayman)(?: T)?$/, [2017, 2025], 2, true, 300),
  row('Porsche', /^(?:718 )?(?:Boxster|Cayman) S$/, [2017, 2025], 2.5, true, 350),
  row('Porsche', /^(?:718 )?(?:Boxster|Cayman) GTS$/, [2018, 2019], 2.5, true, 365),
  // Toyota's i-Force Max hybrids, rated as a system.
  row('Toyota', /^Tundra/, [2022, 2026], 3.4, true, 437, 'hybrid'),
  row('Toyota', /^(4Runner|Tacoma)/, [2024, 2026], 2.4, true, 326, 'hybrid'),
];

interface HybridSystem {
  make: string;
  model: RegExp;
  years: [number, number];
  hp: number | ((car: Car) => number);
}

const hy = (
  make: string,
  model: RegExp,
  years: [number, number],
  hp: HybridSystem['hp'],
): HybridSystem => ({ make, model, years, hp });
const turbo = (car: Car) => !!car.engine.aspiration;
const awd = (car: Car) => car.driveType === 'AWD' || car.driveType === '4WD';

/**
 * Hybrids at their system output, as the makers rate them. The test-car
 * list gives a hybrid's engine alone: a Prius read 96-98 hp (the system
 * makes 121-134), a RAV4 Hybrid 176 (219), an Accord Hybrid 146 (204), a
 * Tucson, Santa Fe or Sorento Hybrid 177 (226-231), and a Fusion or MKZ
 * Hybrid 240 (the 2.0 EcoBoost's; the hybrid makes 188).
 */
const HYBRID_SYSTEM: HybridSystem[] = [
  hy('Toyota', /^prius c\b/i, [2012, 2020], 99),
  hy('Toyota', /^prius v\b/i, [2012, 2017], 134),
  hy('Toyota', /^prius\b(?! (?:c|v|prime|plug))/i, [2004, 2009], 110),
  hy('Toyota', /^prius\b(?! (?:c|v|prime|plug))/i, [2010, 2015], 134),
  hy('Toyota', /^prius\b(?! (?:c|v|prime|plug))/i, [2016, 2022], 121),
  hy('Toyota', /^prius\b(?! (?:c|v|prime|plug))/i, [2023, 2026], (c) => (awd(c) ? 196 : 194)),
  hy('Toyota', /^corolla hybrid/i, [2020, 2022], 121),
  hy('Toyota', /^corolla hybrid/i, [2023, 2026], 138),
  hy('Toyota', /^corolla cross/i, [2023, 2026], 196),
  hy('Toyota', /^camry\b/i, [2007, 2011], 187),
  hy('Toyota', /^camry\b/i, [2012, 2017], 200),
  hy('Toyota', /^camry\b/i, [2018, 2024], 208),
  hy('Toyota', /^camry\b/i, [2025, 2026], (c) => (awd(c) ? 232 : 225)),
  hy('Toyota', /^avalon/i, [2013, 2018], 200),
  hy('Toyota', /^avalon/i, [2019, 2022], 215),
  hy('Toyota', /^rav4 hybrid/i, [2016, 2018], 194),
  hy('Toyota', /^rav4 hybrid/i, [2019, 2025], 219),
  hy('Toyota', /^highlander hybrid/i, [2006, 2007], 268),
  hy('Toyota', /^highlander hybrid/i, [2008, 2010], 270),
  hy('Toyota', /^highlander hybrid/i, [2011, 2016], 280),
  hy('Toyota', /^highlander hybrid/i, [2017, 2019], 306),
  hy('Toyota', /^highlander hybrid/i, [2020, 2026], 243),
  hy('Toyota', /^grand highlander/i, [2024, 2026], (c) => (turbo(c) ? 362 : 245)),
  hy('Toyota', /^venza/i, [2021, 2024], 219),
  hy('Toyota', /^sienna/i, [2021, 2026], 245),
  hy('Toyota', /^crown signia/i, [2025, 2026], 240),
  hy('Toyota', /^crown\b/i, [2023, 2026], (c) => (turbo(c) ? 340 : 236)),
  hy('Toyota', /^sequoia/i, [2023, 2026], 437),
  hy('Toyota', /^land cruiser/i, [2024, 2027], 326),
  hy('Lexus', /^ct 200h/i, [2011, 2017], 134),
  hy('Lexus', /^es 300h/i, [2013, 2018], 200),
  hy('Lexus', /^es 300h/i, [2019, 2025], 215),
  hy('Lexus', /^nx 300h/i, [2015, 2021], 194),
  hy('Lexus', /^nx 350h/i, [2022, 2026], 240),
  hy('Lexus', /^rx 450h/i, [2010, 2015], 295),
  hy('Lexus', /^rx 450h/i, [2016, 2022], 308),
  hy('Lexus', /^rx 350h/i, [2023, 2026], 246),
  hy('Lexus', /^[rt]x 500h/i, [2023, 2026], 366),
  hy('Lexus', /^ux 250h/i, [2019, 2024], 181),
  hy('Lexus', /^ux 300h/i, [2025, 2026], 196),
  hy('Lexus', /^l[cs] 500h/i, [2018, 2025], 354),
  hy('Lexus', /^gs 450h/i, [2007, 2011], 340),
  hy('Lexus', /^gs 450h/i, [2013, 2018], 338),
  hy('Lexus', /^rx 400h/i, [2006, 2008], 268),
  hy('Lexus', /^ls 600h/i, [2008, 2016], 438),
  hy('Lexus', /^hs 250h/i, [2010, 2012], 187),
  hy('Lexus', /^lx 700h/i, [2025, 2026], 457),
  hy('Honda', /^accord/i, [2017, 2022], 212),
  hy('Honda', /^accord/i, [2023, 2026], 204),
  hy('Honda', /^cr-v/i, [2020, 2022], 212),
  hy('Honda', /^cr-v/i, [2023, 2026], 204),
  hy('Honda', /^civic hybrid/i, [2006, 2015], 110),
  hy('Honda', /^civic\b/i, [2025, 2026], 200),
  hy('Honda', /^insight/i, [2019, 2022], 151),
  hy('Honda', /^prelude/i, [2026, 2026], 200),
  hy('Acura', /^mdx/i, [2017, 2020], 321),
  hy('Acura', /^rlx/i, [2014, 2020], 377),
  hy('Hyundai', /^(?:elantra hybrid|ioniq)\b/i, [2017, 2026], 139),
  hy('Kia', /^niro\b/i, [2017, 2026], 139),
  hy('Hyundai', /^sonata hybrid/i, [2011, 2012], 206),
  hy('Hyundai', /^sonata hybrid/i, [2013, 2015], 199),
  hy('Hyundai', /^sonata hybrid/i, [2016, 2019], 193),
  hy('Hyundai', /^sonata hybrid/i, [2020, 2026], 192),
  hy('Kia', /^optima hybrid/i, [2011, 2012], 206),
  hy('Kia', /^optima hybrid/i, [2013, 2016], 199),
  hy('Kia', /^optima hybrid/i, [2017, 2020], 192),
  hy('Hyundai', /^(?:tucson|santa fe) hybrid/i, [2021, 2024], (c) =>
    /^santa fe/i.test(c.model) && c.year >= 2024 ? 231 : 226,
  ),
  hy('Hyundai', /^tucson hybrid/i, [2025, 2026], 231),
  hy('Hyundai', /^santa fe hybrid/i, [2025, 2026], 231),
  hy('Kia', /^sorento hybrid/i, [2021, 2024], 227),
  hy('Kia', /^sorento hybrid/i, [2025, 2026], 231),
  hy('Kia', /^sportage hybrid/i, [2023, 2025], 227),
  hy('Kia', /^carnival hybrid/i, [2025, 2027], 242),
  hy('Hyundai', /^palisade hybrid/i, [2026, 2026], 329),
  hy('Ford', /^maverick/i, [2022, 2026], 191),
  hy('Ford', /^escape\b/i, [2020, 2022], 200),
  hy('Ford', /^escape\b/i, [2023, 2026], 192),
  hy('Ford', /^escape hybrid/i, [2005, 2008], 155),
  hy('Ford', /^escape hybrid/i, [2009, 2012], 177),
  hy('Mercury', /^mariner hybrid/i, [2006, 2008], 155),
  hy('Mercury', /^mariner hybrid/i, [2009, 2011], 177),
  hy('Mazda', /^tribute hybrid/i, [2008, 2008], 155),
  hy('Mazda', /^tribute hybrid/i, [2009, 2011], 177),
  hy('Mercury', /^milan hybrid/i, [2010, 2011], 191),
  hy('Ford', /^fusion hybrid/i, [2010, 2012], 191),
  hy('Ford', /^fusion hybrid/i, [2013, 2020], 188),
  hy('Lincoln', /^mkz hybrid/i, [2011, 2012], 191),
  hy('Lincoln', /^mkz hybrid/i, [2013, 2020], 188),
  hy('Ford', /^explorer\b/i, [2020, 2023], 318),
  hy('Ford', /^f-?150/i, [2021, 2026], 430),
  hy('Lincoln', /^nautilus/i, [2024, 2026], 310),
  hy('Ford', /^c-max hybrid/i, [2013, 2018], 188),
  hy('Chevrolet', /^malibu hybrid/i, [2016, 2019], 182),
  hy('Nissan', /^rogue hybrid/i, [2017, 2019], 176),
  hy('Nissan', /^pathfinder hybrid/i, [2014, 2015], 250),
  hy('Nissan', /^altima hybrid/i, [2007, 2011], 198),
  hy('Subaru', /^(?:forester|crosstrek) hybrid/i, [2025, 2026], 194),
  hy('Subaru', /^xv crosstrek hybrid/i, [2014, 2016], 160),
  hy('Mazda', /^cx-50/i, [2025, 2026], 219),
  hy('Jeep', /^cherokee/i, [2026, 2026], 210),
];

function hybridSystemFor(car: Car): number | undefined {
  const rule = HYBRID_SYSTEM.find(
    (h) =>
      h.make === car.make &&
      car.year >= h.years[0] &&
      car.year <= h.years[1] &&
      h.model.test(car.model),
  );
  if (!rule) return undefined;
  return typeof rule.hp === 'function' ? rule.hp(car) : rule.hp;
}

function correctionFor(car: Car): Correction | undefined {
  const fuel = car.engine.fuelType;
  if (fuel !== 'gasoline' && fuel !== 'diesel' && fuel !== 'hybrid') return undefined;
  const litres = car.engine.displacement;
  if (litres == null) return undefined;
  const forced = !!car.engine.aspiration;
  const match = CORRECTIONS.find(
    (c) =>
      c.make === car.make &&
      c.forced === forced &&
      (c.fuel ?? 'gasoline') === fuel &&
      car.year >= c.years[0] &&
      car.year <= c.years[1] &&
      Math.abs(litres - c.litres) <= 0.06 &&
      c.model.test(car.model) &&
      (!c.variant || c.variant.test(car.variant ?? '')),
  );
  if (match || fuel !== 'hybrid') return match;
  const hp = hybridSystemFor(car);
  return hp == null
    ? undefined
    : { make: car.make, model: /./, years: [car.year, car.year], litres, forced, fuel, hp };
}

/** Put the manufacturer's rating on the engines above, whatever the matcher gave them. */
export function applyHorsepowerCorrections(cars: Car[]): { cars: Car[]; corrected: number } {
  let corrected = 0;
  const out = cars.map((car) => {
    const fix = correctionFor(car);
    const clearTurbo = !!fix?.naturallyAspirated && !!car.engine.aspiration;
    if (!fix || (car.engine.horsepower === fix.hp && !clearTurbo)) return car;
    corrected++;
    const { aspiration: _flag, ...engine } = car.engine;
    return {
      ...car,
      engine: {
        ...(clearTurbo ? engine : car.engine),
        horsepower: fix.hp,
        horsepowerBasis: 'manufacturer' as const,
      },
      provenance: {
        ...car.provenance,
        'engine.horsepower': 'curated' as const,
        ...(clearTurbo ? { 'engine.aspiration': 'curated' as const } : {}),
      },
    };
  });
  return { cars: out, corrected };
}
