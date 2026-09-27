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
      c.model.test(car.model),
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
      engine: { ...car.engine, horsepower: fix.hp },
      provenance: { ...car.provenance, 'engine.horsepower': 'curated' as const },
    };
  });
  return { cars: out, corrected };
}
