import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { getAllCars } from '../services/car.service.js';

/**
 * Estimated market values against observed Canadian prices.
 *
 * New vehicles are compared with the midpoint of the manufacturer's Canadian
 * MSRP range; used vehicles with the average asking price of current listings
 * (CarGurus Canada, April–September 2026). The model estimates from a handful of
 * inputs (size class, brand, age), so the tolerance is wide; before this test
 * existed, new compacts came out 50–90% high (a 2026 Elantra at $46,500).
 *
 * When prices move, update the references with their source and date rather
 * than widening the tolerance.
 */
interface Reference {
  label: string;
  find: (c: Car) => boolean;
  observedCad: number;
  source: string;
}

const TOLERANCE = 0.25;

const named = (make: string, model: RegExp, year: number) => (c: Car) =>
  c.make === make && c.year === year && model.test(c.model) && c.engine.fuelType !== 'hybrid';

/** A named model with a given engine, where EPA lists several under one name. */
const withEngine = (make: string, model: RegExp, year: number, litres: number) => (c: Car) =>
  named(make, model, year)(c) && c.engine.displacement === litres;

const REFERENCES: Reference[] = [
  // New: midpoint of the Canadian MSRP range (before freight).
  {
    label: '2026 Hyundai Elantra (new)',
    find: named('Hyundai', /^Elantra$/, 2026),
    observedCad: 25_500,
    source: 'Hyundai Canada MSRP $23,499–$27,499 (non-hybrid)',
  },
  {
    label: '2026 Honda Civic sedan (new)',
    find: named('Honda', /^Civic 4Dr$/, 2026),
    observedCad: 31_000,
    source: 'Honda Canada MSRP $28,340 LX to $36,700 Si',
  },
  {
    label: '2026 Toyota Corolla (new)',
    find: named('Toyota', /^Corolla$/, 2026),
    observedCad: 28_000,
    source: 'Toyota Canada MSRP from $24,520 (gas trims to ~$31k)',
  },
  {
    label: '2026 Chevrolet Trax (new)',
    find: named('Chevrolet', /^Trax$/, 2026),
    observedCad: 28_300,
    source: 'Chevrolet Canada MSRP $26,699–$29,899',
  },
  // Used: average asking price of current listings.
  {
    label: '2023 Honda Civic sedan',
    find: named('Honda', /^Civic 4Dr$/, 2023),
    observedCad: 25_500,
    source: 'CarGurus Toronto average, 2026',
  },
  {
    label: '2020 Toyota Corolla',
    find: named('Toyota', /^Corolla$/, 2020),
    observedCad: 18_600,
    source: 'CarGurus Toronto average, 2026',
  },
  {
    label: '2020 Toyota RAV4',
    find: named('Toyota', /^RAV4$/, 2020),
    observedCad: 27_200,
    source: 'CarGurus Toronto average, June 2026',
  },
  {
    label: '2018 Toyota Camry',
    find: named('Toyota', /^Camry$/, 2018),
    observedCad: 21_200,
    source: 'CarGurus Canada average, June 2026',
  },
  {
    label: '2019 Ford F-150',
    find: named('Ford', /^F150 Pickup 2WD$/, 2019),
    observedCad: 29_100,
    source: 'CarGurus Toronto average, April 2026',
  },
  {
    label: '2013 Honda Civic',
    find: named('Honda', /^Civic$/, 2013),
    observedCad: 10_600,
    source: 'CarGurus Ontario average, 2026',
  },
  {
    label: '2006 Toyota Corolla',
    find: named('Toyota', /^Corolla$/, 2006),
    observedCad: 6_400,
    source: 'CarGurus Canada average, 2026',
  },
  {
    label: '2023 Porsche Macan',
    find: named('Porsche', /^Macan$/, 2023),
    observedCad: 66_700,
    source: 'CarGurus Canada average, 2026',
  },
  {
    label: '2022 Tesla Model 3',
    find: named('Tesla', /^Model 3 RWD$/, 2022),
    observedCad: 32_600,
    source: 'CarGurus Canada average (all trims), August 2026',
  },
  // Luxury. One luxury premium for every size class under-anchored small
  // sedans and over-anchored small SUVs, and the X5 rule's pre-2020 sticker
  // was $10,000 high (+55% before).
  {
    label: '2019 Mercedes-Benz C300 4MATIC',
    find: named('Mercedes-Benz', /^C300 4matic$/i, 2019),
    observedCad: 30_000,
    source: 'CarGurus Canada average, C 300 4MATIC, September 2026',
  },
  {
    label: '2018 Lexus RX 350',
    find: named('Lexus', /^RX 350$/, 2018),
    observedCad: 32_050,
    source: 'CarGurus Toronto average, September 2026',
  },
  {
    label: '2020 Audi Q5',
    find: named('Audi', /^Q5$/, 2020),
    observedCad: 24_850,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2015 BMW X5',
    find: named('BMW', /^X5 /, 2015),
    observedCad: 16_770,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2014 Mercedes-Benz C300 4MATIC',
    find: named('Mercedes-Benz', /^C300 4matic$/i, 2014),
    observedCad: 12_900,
    source: 'CarGurus Canada average (all C-Class trims), September 2026',
  },
  {
    label: '2014 Lexus RX 350',
    find: named('Lexus', /^RX 350$/, 2014),
    observedCad: 18_640,
    source: 'CarGurus Canada average, September 2026',
  },
  // Performance cars. EPA filed the Mustang as a small sedan, so it took an
  // economy car's price and curve (-44%); the Corvette and Type R hold value
  // far better than any segment curve (-46%, -45% before).
  {
    label: '2020 Ford Mustang EcoBoost coupe',
    find: (c) =>
      c.make === 'Ford' &&
      c.model === 'Mustang' &&
      c.year === 2020 &&
      c.engine.displacement === 2.3,
    observedCad: 25_000,
    source: 'CarGurus Canada average, EcoBoost Coupe RWD, September 2026',
  },
  {
    label: '2020 Ford Mustang GT coupe',
    find: (c) =>
      c.make === 'Ford' && c.model === 'Mustang' && c.year === 2020 && c.engine.displacement === 5,
    observedCad: 33_500,
    source: 'CarGurus Canada average, GT Premium Coupe RWD, September 2026',
  },
  {
    label: '2021 Chevrolet Corvette',
    find: named('Chevrolet', /^Corvette$/, 2021),
    observedCad: 91_200,
    source: 'CarGurus Canada average (all trims), September 2026',
  },
  {
    label: '2020 Honda Civic Type R',
    find: (c) =>
      c.make === 'Honda' &&
      c.model === 'Civic 5Dr' &&
      c.year === 2020 &&
      c.engine.aspiration === 'turbocharged' &&
      c.engine.displacement === 2,
    observedCad: 49_900,
    source: 'CarGurus Canada average, September 2026',
  },
  // Trucks and body-on-frame SUVs. GMC sat on the luxury list (Sierra +52%),
  // pickups kept ~60% of today's price at seven years where listings show
  // 45–55%, every Bronco shared the Bronco Sport's anchor (-40%), and Toyota's
  // trucks hold value far beyond any segment curve (Tacoma -38%).
  {
    label: '2019 Chevrolet Silverado 1500 V8',
    find: withEngine('Chevrolet', /^Silverado K10 4WD$/, 2019, 5.3),
    observedCad: 30_840,
    source: 'CarGurus Canada average (all trims), September 2026',
  },
  {
    label: '2019 GMC Sierra 1500 V8',
    find: withEngine('GMC', /^Sierra K10 4WD$/, 2019, 5.3),
    observedCad: 34_470,
    source: 'CarGurus Canada average (all trims), September 2026',
  },
  {
    label: '2019 Toyota Tundra',
    find: withEngine('Toyota', /^Tundra 4WD$/, 2019, 5.7),
    observedCad: 39_560,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2019 Toyota Tacoma V6',
    find: withEngine('Toyota', /^Tacoma 4WD$/, 2019, 3.5),
    observedCad: 39_820,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2019 Chevrolet Colorado V6',
    find: withEngine('Chevrolet', /^Colorado 4WD$/, 2019, 3.6),
    observedCad: 27_130,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2018 Jeep Wrangler Unlimited (JL)',
    find: withEngine('Jeep', /^New Wrangler Unlimited 4WD$/, 2018, 3.6),
    observedCad: 24_340,
    source: 'CarGurus Canada average (JK and JL), September 2026',
  },
  {
    label: '2021 Ford Bronco 2.7',
    find: withEngine('Ford', /^Bronco 4WD$/, 2021, 2.7),
    observedCad: 39_210,
    source: 'CarGurus Canada average (all trims), September 2026',
  },
  {
    label: '2019 Toyota Highlander V6',
    find: withEngine('Toyota', /^Highlander AWD$/, 2019, 3.5),
    observedCad: 30_170,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2019 Chevrolet Tahoe',
    find: withEngine('Chevrolet', /^Tahoe K1500 4WD$/, 2019, 5.3),
    observedCad: 33_390,
    source: 'CarGurus Ontario average, September 2026',
  },
  {
    // EPA files it a "Small" SUV by weight, which anchored it like a CR-V
    // (-27%) while its twin, the Palisade, flipped between classes by year.
    label: '2021 Kia Telluride',
    find: named('Kia', /^Telluride AWD$/, 2021),
    observedCad: 32_270,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2019 Toyota Sienna',
    find: named('Toyota', /^Sienna 2WD$/, 2019),
    observedCad: 30_150,
    source: 'CarGurus Canada average, September 2026',
  },
  // Plug-in hybrids: the PHEV curve was steeper than the listings.
  {
    label: '2021 Toyota RAV4 Prime',
    find: named('Toyota', /^RAV4 Prime 4WD$/, 2021),
    observedCad: 39_240,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2020 Toyota Prius Prime',
    find: named('Toyota', /^Prius Prime$/, 2020),
    observedCad: 23_020,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2020 Chrysler Pacifica Hybrid',
    find: named('Chrysler', /^Pacifica Hybrid$/, 2020),
    observedCad: 29_890,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2019 Chevrolet Volt',
    find: named('Chevrolet', /^Volt$/, 2019),
    observedCad: 15_740,
    source: 'CarGurus Canada average, September 2026',
  },
  // Electric. Per-tier curves had these between -28% and +21%, and a battery
  // factor lowered the midpoint again for wear the averages already include.
  // Lines sold in several trims are compared on their core trim.
  {
    label: '2022 Hyundai Ioniq 5 RWD Long Range',
    find: named('Hyundai', /^Ioniq 5 RWD \(Long Range\)$/, 2022),
    observedCad: 28_550,
    source: 'CarGurus Canada average (all trims), September 2026',
  },
  {
    label: '2021 Ford Mustang Mach-E AWD',
    find: named('Ford', /^Mustang Mach-E AWD$/, 2021),
    observedCad: 28_360,
    source: 'CarGurus Canada average (all trims), September 2026',
  },
  {
    label: '2021 Tesla Model Y Long Range',
    find: named('Tesla', /^Model Y Long Range AWD$/, 2021),
    observedCad: 36_000,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2021 Volkswagen ID.4 AWD Pro',
    find: named('Volkswagen', /^ID\.4 AWD Pro$/, 2021),
    observedCad: 27_540,
    source: 'CarGurus Canada average (all trims), September 2026',
  },
  {
    label: '2021 Chevrolet Bolt EV',
    find: named('Chevrolet', /^Bolt EV$/, 2021),
    observedCad: 20_440,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2020 Nissan Leaf',
    find: named('Nissan', /^Leaf$/, 2020),
    observedCad: 18_530,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2019 Hyundai Kona Electric',
    find: named('Hyundai', /^Kona Electric$/, 2019),
    observedCad: 17_470,
    source: 'CarGurus Canada average, September 2026',
  },
  {
    label: '2017 Chevrolet Bolt EV',
    find: named('Chevrolet', /^Bolt EV$/, 2017),
    observedCad: 16_430,
    source: 'CarGurus Canada average, September 2026',
  },
];

describe('valuation calibration against observed Canadian prices', () => {
  it.each(REFERENCES.map((r) => [r.label, r] as const))('%s', (_label, ref) => {
    const car = getAllCars().find(ref.find);
    expect(car, `${ref.label} should exist in the corpus`).toBeDefined();
    const mid = car!.price!.msrp!;
    const error = mid / ref.observedCad - 1;
    expect(
      Math.abs(error),
      `${ref.label}: estimate $${mid.toLocaleString()} vs observed $${ref.observedCad.toLocaleString()} (${ref.source}), ${(error * 100).toFixed(0)}%`,
    ).toBeLessThanOrEqual(TOLERANCE);
  });
});
