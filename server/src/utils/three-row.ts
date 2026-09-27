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
      'hyundai (?:palisade|santa fe xl|entourage|ioniq 9)',
      'kia (?:telluride|sorento|sedona|carnival|ev9|borrego)',
      'volkswagen (?:atlas(?! cross)|routan|id\\. ?buzz)',
      'chevrolet (?:traverse|tahoe|suburban)',
      'gmc (?:acadia|yukon)',
      'buick enclave',
      'ford (?:explorer|expedition|flex|freestar)',
      'lincoln (?:navigator|aviator|mkt)',
      'dodge (?:durango|journey|grand caravan|caravan)',
      'chrysler (?:pacifica|town (?:&|and) country|voyager)',
      'jeep (?:grand cherokee l|wagoneer|grand wagoneer|commander)',
      'cadillac (?:escalade|xt6)',
      'acura mdx',
      'lexus (?:gx|lx|tx|rx 350l|rx 450hl)',
      'mercedes-benz (?:amg )?(?:gls ?\\d*|gl ?\\d+|r ?\\d{3}|eqs \\d{3}\\+? suv|maybach gls)',
      'bmw x7',
      'audi q7',
      'volvo (?:xc90|ex90)',
      'land rover (?:discovery(?! sport)|lr3|lr4|defender 130)',
      'tesla model x',
      'rivian r1s',
      'mitsubishi outlander(?! sport)',
    ].join('|') +
    ')\\b',
);

export function isThreeRow(car: CarSpecs): boolean {
  if (car.bodyStyle === 'minivan') return true;
  const name = `${car.make} ${car.model}`.toLowerCase();
  if (car.bodyStyle === 'van') return /passenger|wagon/.test(name);
  return THREE_ROW_MODELS.test(name);
}
