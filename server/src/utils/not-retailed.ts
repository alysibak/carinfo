import type { CarSpecs } from '../types/car.types.js';

/**
 * Cars EPA rated that were never sold to the public: leased and taken back,
 * built for fleets, or built for the Postal Service. With no used market,
 * the depreciation model's figure is a price nobody can pay: a 1999 EV1 read
 * $8,750, a Honda EV Plus $4,900, and a Lordstown Endurance led "cheap
 * electric truck". The site says it does not value them instead.
 *
 * Sources: Honda's releases for the Fit EV (lease only, no purchase option)
 * and Clarity Electric ("only available for lease"); BYD's fleet-only US
 * policy (Green Car Reports, 2013); Lordstown's 31 trucks and six deliveries
 * (Wikipedia); the MINI E, ActiveE, Scion iQ EV and 2011 smart ED field
 * trials (BMW and Toyota press releases, Green Car Reports).
 */

interface NotRetailedRule {
  test: (car: CarSpecs) => boolean;
  /** Who had it, for the car page: "Honda leased it only, with no option to buy". */
  why: string;
}

const make = (car: CarSpecs, name: string) => car.make.toLowerCase() === name;
const electric = (car: CarSpecs) => car.engine.fuelType === 'electric';

const RULES: NotRetailedRule[] = [
  {
    test: (c) => /^ev1$/i.test(c.model),
    why: 'GM leased it only, then recalled and crushed almost every one',
  },
  {
    test: (c) => make(c, 'honda') && /^ev plus\b/i.test(c.model),
    why: 'Honda leased it only, and took every one back',
  },
  {
    test: (c) => make(c, 'chevrolet') && /^s-?10 electric\b/i.test(c.model),
    why: 'Chevrolet built it for utility and government fleets',
  },
  {
    test: (c) => make(c, 'ford') && electric(c) && /^ranger\b/i.test(c.model),
    why: 'Ford leased it, mostly to fleets',
  },
  {
    // Chrysler's EPIC, filed under the Caravan and Voyager names.
    test: (c) =>
      /^(dodge|plymouth|chrysler)$/i.test(c.make) &&
      electric(c) &&
      /\b(caravan|voyager)\b/i.test(c.model),
    why: 'Chrysler leased its EPIC electric minivans to government and utility fleets',
  },
  {
    test: (c) => make(c, 'nissan') && /^altra\b/i.test(c.model),
    why: 'Nissan leased it to fleets only',
  },
  {
    test: (c) => make(c, 'nissan') && /^hyper-?mini\b/i.test(c.model),
    why: 'Nissan built it for city and campus fleets',
  },
  {
    test: (c) => make(c, 'ford') && /^th!?nk\b/i.test(c.model),
    why: 'Ford leased it in station-car trials in California and New York',
  },
  {
    test: (c) => make(c, 'ford') && /\busps\b|^postal vehicle\b/i.test(c.model),
    why: 'Ford built it for the US Postal Service',
  },
  {
    test: (c) => make(c, 'mini') && /^mini ?e$/i.test(c.model),
    why: 'BMW leased it for a year-long field trial and took every one back',
  },
  {
    test: (c) => make(c, 'bmw') && /^active ?e\b/i.test(c.model),
    why: 'BMW leased it for a two-year field trial',
  },
  {
    // The 2013 and later cars were sold; the first 250 were a leased trial.
    test: (c) => make(c, 'smart') && /electric drive/i.test(c.model) && c.year <= 2012,
    why: 'smart leased 250 in a US field trial, most to company fleets',
  },
  {
    test: (c) => make(c, 'honda') && /^fcx\b/i.test(c.model),
    why: 'Honda leased it only, in southern California',
  },
  {
    test: (c) => make(c, 'honda') && /^clarity (fcv|fuel cell)\b/i.test(c.model),
    why: 'Honda leased it only, in California',
  },
  {
    test: (c) => make(c, 'honda') && /^clarity (ev|electric)\b/i.test(c.model),
    why: 'Honda leased it only, in California and Oregon',
  },
  {
    test: (c) => make(c, 'honda') && /^fit ev\b/i.test(c.model),
    why: 'Honda leased it only, with no option to buy',
  },
  {
    test: (c) => make(c, 'hyundai') && /^tucson fuel cell\b/i.test(c.model),
    why: 'Hyundai leased it only, in California',
  },
  {
    test: (c) => make(c, 'scion') && /^iq ev\b/i.test(c.model),
    why: 'Toyota built about 90 for car-sharing and campus fleets',
  },
  {
    test: (c) => make(c, 'byd') && /^e6\b/i.test(c.model),
    why: 'BYD sold it in North America to taxi and ride-hailing fleets only',
  },
  {
    test: (c) => make(c, 'lordstown') && /^endurance\b/i.test(c.model),
    why: 'Lordstown built 31 and delivered six before it went bankrupt in 2023',
  },
  {
    test: (c) => make(c, 'hyundai') && /\brobo ?taxi\b/i.test(c.model),
    why: "Hyundai builds it for Motional's driverless ride-hailing fleet",
  },
];

/** Why a car was never sold to the public, or undefined when it was. */
export function notRetailedReason(car: CarSpecs): string | undefined {
  return RULES.find((rule) => rule.test(car))?.why;
}
