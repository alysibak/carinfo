import type { Car } from '../types/car.types.js';

/**
 * Manufacturer ratings for best-selling engines the EPA Test Car List match
 * got wrong. The committed horsepower file predates the matcher's fixes (see
 * README) and borrowed ratings across engines: every 2017–22 CR-V turbo at
 * the CR-V Hybrid's 143 hp engine rating (the car makes 190), every 2019+
 * Mazda 2.5 at 207 (186–191), Hyundai and Kia's 2.5 at 236–241 (191), the
 * STI at the WRX's 268 (305–310), the Grand Cherokee EcoDiesel at 172 (240),
 * the Bronco Sport Sasquatch at 91 (181). Each row is one engine in one span
 * of model years; hybrids and plug-ins are rated differently and never match.
 */
interface Correction {
  make: string;
  model: RegExp;
  years: [number, number];
  litres: number;
  forced: boolean;
  fuel?: 'gasoline' | 'diesel';
  hp: number;
  /** The derived trim, where it tells engines of one size apart (a Civic Si). */
  variant?: RegExp;
}

const row = (
  make: string,
  model: RegExp,
  years: [number, number],
  litres: number,
  forced: boolean,
  hp: number,
  fuel: 'gasoline' | 'diesel' = 'gasoline',
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
];

function correctionFor(car: Car): Correction | undefined {
  const fuel = car.engine.fuelType;
  if (fuel !== 'gasoline' && fuel !== 'diesel') return undefined;
  const litres = car.engine.displacement;
  if (litres == null) return undefined;
  const forced = !!car.engine.aspiration;
  return CORRECTIONS.find(
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
}

/** Put the manufacturer's rating on the engines above, whatever the matcher gave them. */
export function applyHorsepowerCorrections(cars: Car[]): { cars: Car[]; corrected: number } {
  let corrected = 0;
  const out = cars.map((car) => {
    const fix = correctionFor(car);
    if (!fix || car.engine.horsepower === fix.hp) return car;
    corrected++;
    return {
      ...car,
      engine: { ...car.engine, horsepower: fix.hp, horsepowerBasis: 'manufacturer' as const },
      provenance: { ...car.provenance, 'engine.horsepower': 'curated' as const },
    };
  });
  return { cars: out, corrected };
}
