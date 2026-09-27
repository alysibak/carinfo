import type { CarSpecs } from '../types/car.types.js';

/**
 * Vehicles with a third row of seats, by name: EPA records no seating. Every
 * minivan and passenger van, and the SUVs sold with a third row as standard or
 * a common option. A shopper's "third row suv" or "7 seater" found nothing,
 * or only the 2006 Isuzu Ascender "7-passenger".
 */
const THREE_ROW_MODELS = new RegExp(
  '^(?:' +
    [
      'toyota (?:highlander|grand highlander|sequoia|land cruiser)',
      'honda (?:pilot|odyssey)',
      'nissan (?:pathfinder|armada|quest)',
      'infiniti (?:qx60|qx80|qx56|jx35)',
      'mazda (?:cx-9|cx-90|mpv)',
      'subaru (?:ascent|tribeca|b9 tribeca)',
      'hyundai (?:palisade|santa fe xl|entourage|ioniq 9|veracruz)',
      'kia (?:telluride|sorento|sedona|carnival|ev9|borrego)',
      'volkswagen (?:atlas(?! cross)|routan|id\\. ?buzz)',
      'chevrolet (?:traverse|tahoe|suburban|trailblazer ext)',
      'gmc (?:acadia|yukon|suburban|envoy xl)',
      'buick enclave',
      'saturn outlook',
      'isuzu ascender(?! 5-passenger)',
      'ford (?:explorer(?! sport)|expedition|flex|freestar|freestyle|taurus x|excursion)',
      'mercury mountaineer',
      'lincoln (?:navigator|aviator|mkt)',
      'dodge (?:durango|journey|grand caravan|caravan)',
      'chrysler (?:pacifica|town (?:&|and) country|voyager|aspen)',
      'jeep (?:grand cherokee l|wagoneer(?! s\\b)|grand wagoneer|commander)',
      'cadillac (?:escalade|xt6|vistiq)',
      'acura mdx',
      'lexus (?:gx|lx|tx|rx 350l|rx 450hl)',
      'mercedes-benz (?:amg )?(?:gls ?\\d*|gl ?\\d+|r ?\\d{3}|eqs \\d{3}\\b.*\\bsuv\\b)',
      'bmw x7',
      'audi q7',
      'volvo (?:xc90|ex90)',
      'land rover (?:discovery(?! sport)|lr3|lr4|defender 130)',
      'tesla model x',
      'rivian r1s',
      'vinfast vf ?9',
      'suzuki (?:grand vitara )?xl-?7',
      'mitsubishi (?:outlander(?! sport)|montero(?! sport))',
    ].join('|') +
    ')\\b',
);

/**
 * Years a line above went without a third row: before it gained one, or after
 * it lost it. The 2024 Land Cruiser is a two-row SUV in North America, the 2025
 * Tiguan dropped the third row the 2018 car had; the Highlander, Pathfinder,
 * Sorento, Outlander and Explorer each began with two rows, as did the 1990s
 * Tahoe and Yukon and the Mountaineer before 2002.
 */
const TWO_ROW_YEARS: [RegExp, (year: number) => boolean][] = [
  [/^toyota land cruiser\b/, (y) => y >= 2024],
  [/^toyota highlander\b/, (y) => y < 2004],
  [/^nissan pathfinder\b(?! armada)/, (y) => y < 2005],
  [/^kia sorento\b/, (y) => y < 2011],
  [/^mitsubishi outlander phev\b/, (y) => y < 2023],
  [/^mitsubishi outlander\b/, (y) => y < 2007],
  [/^ford explorer\b/, (y) => y < 2002],
  [/^mercury mountaineer\b/, (y) => y < 2002],
  [/^(?:chevrolet tahoe|gmc yukon)\b/, (y) => y < 2000],
];

/** Lines that had a third row only in some years. */
const THREE_ROW_YEARS: [RegExp, (year: number) => boolean][] = [
  // Every 2024-on Santa Fe has three rows; from 2019 to 2023 it had two.
  [/^hyundai santa fe\b(?! (?:sport|xl)\b)/, (y) => y >= 2024],
  // The long-wheelbase Tiguan of 2018-24, not the "Limited", the old car sold alongside.
  [/^volkswagen tiguan\b(?! limited)/, (y) => y >= 2018 && y <= 2024],
];

export function isThreeRow(car: CarSpecs): boolean {
  if (car.bodyStyle === 'minivan') return true;
  // Pickups, the Avalanche and Escalade EXT among them, have two rows at most.
  if (car.bodyStyle === 'truck') return false;
  const name = `${car.make} ${car.model}`.toLowerCase();
  if (car.bodyStyle === 'van') return /passenger|wagon/.test(name);
  // Lucid names the rows ("Gravity GT (3R)"); the Maybach GLS seats four or five.
  const rows = /\((\d)r\)/.exec(name);
  if (rows) return rows[1] === '3';
  if (/\bmaybach\b/.test(name)) return false;
  const year = car.year;
  if (THREE_ROW_YEARS.some(([re, within]) => re.test(name) && within(year))) return true;
  if (!THREE_ROW_MODELS.test(name)) return false;
  return !TWO_ROW_YEARS.some(([re, twoRow]) => re.test(name) && twoRow(year));
}
