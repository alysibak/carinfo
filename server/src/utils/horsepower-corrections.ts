import type { Car } from '../types/car.types.js';
import { MAKER_RATINGS } from './maker-ratings.js';

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
export interface Correction {
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
  /** Tells apart versions of one engine the name does not (manual or automatic). */
  when?: (car: Car) => boolean;
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
  hy('Kia', /^telluride (?:fe )?hybrid/i, [2027, 2027], 329),
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
  // Performance hybrids read their engine alone: an NSX 500 hp (573), a
  // Corvette E-Ray 495 (655), a Q50 Hybrid 301 (360).
  hy('Acura', /^nsx/i, [2017, 2021], 573),
  hy('Acura', /^nsx/i, [2022, 2022], 600),
  hy('Chevrolet', /^corvette e-ray/i, [2024, 2026], 655),
  // The eTorque Hemi and the C300's 48-volt four, rated as their engines.
  hy('Ram', /^1500\b/i, [2027, 2027], (c) => ((c.engine.displacement ?? 0) > 5 ? 395 : 305)),
  hy('Mercedes-Benz', /^c300\b/i, [2027, 2027], 255),
  hy('Ferrari', /^f80$/i, [2026, 2026], 1184),
  hy('Infiniti', /^(?:q50s? hybrid|q70 hybrid|m35h)/i, [2012, 2018], 360),
  hy('Nissan', /^murano hybrid/i, [2016, 2016], 250),
  hy('Porsche', /^(?:panamera|cayenne) s hybrid/i, [2011, 2014], 380),
  hy('BMW', /^activehybrid [35]\b/i, [2012, 2016], 335),
  hy('BMW', /^activehybrid 7/i, [2013, 2015], 349),
  hy('BMW', /^x6 activehybrid/i, [2010, 2011], 480),
];

/**
 * Plug-in hybrids at their system output. Most read their engine: a RAV4
 * Prime 203 hp (the system makes 302), a Wrangler or Grand Cherokee 4xe 270
 * (375), a Volvo T8 312 (455), an SF90 770 (986), a Polestar 1 322 (619).
 */
const PLUG_IN_SYSTEM: HybridSystem[] = [
  hy('Toyota', /^prius plug-in/i, [2012, 2015], 134),
  hy('Toyota', /^prius (?:prime|phev)/i, [2017, 2022], 121),
  hy('Toyota', /^prius (?:prime|phev)/i, [2023, 2026], 220),
  hy('Toyota', /^rav4 (?:prime|phev)/i, [2021, 2025], 302),
  hy('Hyundai', /^ioniq plug-in/i, [2018, 2022], 139),
  hy('Hyundai', /^sonata plug-in/i, [2016, 2019], 202),
  hy('Hyundai', /^(?:tucson|santa fe) plug-in/i, [2022, 2026], (c) =>
    /^santa fe/i.test(c.model) ? 260 : 261,
  ),
  hy('Kia', /^niro plug-in/i, [2018, 2022], 139),
  hy('Kia', /^niro plug-in/i, [2023, 2026], 180),
  hy('Kia', /^optima plug-in/i, [2017, 2020], 202),
  hy('Kia', /^(?:sorento|sportage) plug-in/i, [2022, 2026], 261),
  hy('Ford', /^escape\b/i, [2020, 2022], 221),
  hy('Ford', /^escape\b/i, [2023, 2026], 210),
  hy('Ford', /^(?:fusion|c-max) (?:energi|special service)/i, [2013, 2020], 188),
  hy('Lincoln', /^corsair/i, [2021, 2026], 266),
  hy('Lincoln', /^aviator/i, [2020, 2023], 494),
  hy('Chevrolet', /^volt/i, [2011, 2019], 149),
  hy('Cadillac', /^elr/i, [2014, 2015], 207),
  hy('Cadillac', /^elr/i, [2016, 2016], 233),
  hy('Cadillac', /^ct6/i, [2017, 2018], 335),
  hy('Chrysler', /^pacifica/i, [2017, 2026], 260),
  hy('Dodge', /^hornet/i, [2024, 2025], 288),
  hy('Jeep', /^(?:wrangler|grand cherokee)\b.*4xe/i, [2021, 2026], 375),
  hy('Alfa Romeo', /^tonale/i, [2024, 2025], 285),
  hy('Honda', /^clarity plug-in/i, [2018, 2021], 212),
  hy('Honda', /^accord plug-in/i, [2014, 2014], 196),
  hy('Mitsubishi', /^outlander phev/i, [2018, 2020], 197),
  hy('Mitsubishi', /^outlander phev/i, [2021, 2022], 221),
  hy('Mitsubishi', /^outlander phev/i, [2023, 2025], 248),
  hy('Subaru', /^crosstrek hybrid/i, [2019, 2023], 148),
  hy('Mazda', /^cx-[79]0/i, [2024, 2026], 323),
  hy('Lexus', /^[nr]x 450h(?: plus|\+)/i, [2022, 2026], 304),
  hy('Nissan', /^rogue plug-in hybrid/i, [2026, 2026], 248),
  hy('Lexus', /^tx 550h plus/i, [2024, 2025], 404),
  hy('BMW', /^330e/i, [2016, 2018], 248),
  hy('BMW', /^330e/i, [2021, 2024], 288),
  hy('BMW', /^530e/i, [2018, 2020], 248),
  hy('BMW', /^530e/i, [2021, 2023], 288),
  hy('BMW', /^(?:550e|750e)|^x5 xdrive50e/i, [2024, 2026], 483),
  hy('BMW', /^740e/i, [2017, 2019], 322),
  hy('BMW', /^745e|^x5 xdrive45e/i, [2020, 2023], 389),
  hy('BMW', /^x5 xdrive40e/i, [2016, 2018], 308),
  hy('BMW', /^x3 xdrive30e/i, [2020, 2021], 288),
  hy('BMW', /^xm label/i, [2025, 2026], 738),
  hy('BMW', /^xm\b/i, [2023, 2025], 644),
  hy('BMW', /^m5\b/i, [2025, 2026], 717),
  hy('BMW', /^i8\b/i, [2014, 2017], 357),
  hy('BMW', /^i8\b/i, [2019, 2020], 369),
  // The i3 with Range Extender is driven by its motor; the 0.6 L engine only charges.
  hy('BMW', /^i3s with range extender/i, [2018, 2021], 181),
  hy('BMW', /^i3 (?:rex|with range extender)/i, [2014, 2021], 170),
  hy('Mercedes-Benz', /^s560e/i, [2019, 2020], 463),
  hy('Mercedes-Benz', /^s580e/i, [2023, 2025], 503),
  hy('Mercedes-Benz', /^gle ?450e/i, [2024, 2026], 375),
  hy('Mercedes-Benz', /^glc ?350e/i, [2025, 2026], 313),
  hy('Mercedes-Benz', /^amg (?:c|glc)63 s e performance/i, [2024, 2026], 671),
  hy('Mercedes-Benz', /^amg e53 hybrid/i, [2025, 2026], 577),
  hy('Mercedes-Benz', /^amg gt 63 s e performance/i, [2024, 2026], 831),
  hy('Mercedes-Benz', /^amg s63 e performance/i, [2024, 2026], 791),
  hy('Mercedes-Benz', /^amg sl63 s e performance/i, [2025, 2026], 805),
  hy('Porsche', /^cayenne\b.*turbo s\b.*e-hybrid/i, [2020, 2023], 670),
  hy('Porsche', /^cayenne\b.*turbo e-hybrid/i, [2025, 2026], 729),
  hy('Porsche', /^cayenne\b.*\bs e-hybrid/i, [2025, 2026], 512),
  hy('Porsche', /^cayenne\b.*e-hybrid/i, [2019, 2023], 455),
  hy('Porsche', /^cayenne\b.*e-hybrid/i, [2025, 2026], 463),
  hy('Porsche', /^panamera turbo s e-hybrid/i, [2018, 2020], 680),
  hy('Porsche', /^panamera turbo s e-hybrid/i, [2021, 2023], 690),
  hy('Porsche', /^panamera 4s e-hybrid/i, [2021, 2023], 552),
  hy('Porsche', /^panamera 4 e-hybrid/i, [2018, 2023], 455),
  hy('Porsche', /^panamera turbo s e-hybrid/i, [2025, 2026], 771),
  hy('Porsche', /^panamera turbo e-hybrid/i, [2025, 2026], 670),
  hy('Porsche', /^panamera 4s e-hybrid/i, [2025, 2026], 536),
  hy('Porsche', /^panamera 4 e-hybrid/i, [2025, 2026], 463),
  hy('Volvo', /^(?:s60|v60|s90|v90|xc60|xc90)\b/i, [2016, 2026], (c) =>
    c.year >= 2023 || (c.year === 2022 && /ext/i.test(c.model)) ? 455 : 400,
  ),
  hy('Land Rover', /^new range rover (?:sport )?p440/i, [2023, 2023], 434),
  hy('Land Rover', /^range rover p550/i, [2025, 2025], 542),
  hy('Land Rover', /^range rover (?:sport )?phev/i, [2019, 2022], 398),
  hy('Bentley', /^bentayga(?: hybrid)?$/i, [2020, 2024], 443),
  hy('Bentley', /^continental gtc? speed$/i, [2025, 2026], 771),
  hy('Bentley', /^continental gtc?$/i, [2025, 2026], 671),
  hy('Bentley', /^flying spur hybrid/i, [2022, 2024], 536),
  hy('Lamborghini', /^urus se/i, [2025, 2026], 789),
  hy('Lamborghini', /^revuelto/i, [2024, 2026], 1001),
  hy('Lamborghini', /^temerario/i, [2025, 2026], 907),
  hy('Ferrari', /^849 testarossa/i, [2026, 2026], 1035),
  hy('Ferrari', /^sf90 xx/i, [2025, 2025], 1016),
  hy('Ferrari', /^sf90/i, [2021, 2025], 986),
  hy('Ferrari', /^296 speciale/i, [2026, 2026], 868),
  hy('Ferrari', /^296/i, [2022, 2026], 819),
  hy('McLaren Automotive', /^artura/i, [2023, 2024], 671),
  hy('Polestar', /^1\b/i, [2020, 2021], 619),
  hy('Fisker', /^karma/i, [2012, 2012], 403),
  hy('Karma', /^revero gt|^gs-6/i, [2020, 2021], 536),
  hy('Karma', /^revero/i, [2018, 2019], 403),
  hy('MINI', /^cooper se countryman/i, [2018, 2023], 221),
  hy('Audi', /^a3 e-tron/i, [2016, 2018], 204),
  hy('Audi', /^(?:q5|a7)\b/i, [2020, 2025], 362),
  hy('Audi', /^a8\b/i, [2020, 2021], 443),
];

function hybridSystemFor(car: Car): number | undefined {
  const table = car.engine.fuelType === 'plug-in hybrid' ? PLUG_IN_SYSTEM : HYBRID_SYSTEM;
  const rule = table.find(
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
  if (fuel === 'plug-in hybrid') {
    const hp = hybridSystemFor(car);
    const litres = car.engine.displacement ?? 0;
    return hp == null
      ? undefined
      : { make: car.make, model: /./, years: [car.year, car.year], litres, forced: false, hp };
  }
  if (fuel !== 'gasoline' && fuel !== 'diesel' && fuel !== 'hybrid') return undefined;
  const litres = car.engine.displacement;
  if (litres == null) return undefined;
  const forced = !!car.engine.aspiration;
  const matches = (c: Correction) =>
    c.make === car.make &&
    c.forced === forced &&
    (c.fuel ?? 'gasoline') === fuel &&
    car.year >= c.years[0] &&
    car.year <= c.years[1] &&
    Math.abs(litres - c.litres) <= 0.06 &&
    c.model.test(car.model) &&
    (!c.variant || c.variant.test(car.variant ?? '')) &&
    (!c.when || c.when(car));
  const match = CORRECTIONS.find(matches) ?? MAKER_RATINGS.find(matches);
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
