import type { CarSpecs } from '../types/car.types.js';

export type EnginePosition = 'front' | 'mid' | 'rear';

/**
 * Cars with the engine behind the seats, by name: EPA records no engine
 * position, so "mid engine" found nothing and "rear engine" two Ferraris named
 * "Berlinetta". Every McLaren, Bugatti, Pagani, Koenigsegg and Spyker, and
 * every Lamborghini but the Urus; Ferrari's V8 berlinettas, the F512M and the
 * hypercars; the Boxster, Cayman, Carrera GT and 918; the R8, NSX, i8, Lotus
 * Elise, Exige, Evora, Emira and Esprit, 4C, Ford GT, MR2, MC20 and Valhalla.
 */
const MID_ENGINE = new RegExp(
  '^(?:' +
    [
      'mclaren automotive ',
      'lamborghini (?!urus)',
      'bugatti ',
      'pagani ',
      'koenigsegg ',
      'spyker ',
      // EPA's 1990s names repeat the make: "Ferrari F355 Berlinetta/GTS".
      'ferrari (?:ferrari )?(?:348|f?355|360|f430|458|488|f8|296|sf90|enzo|laferrari|f50|f512m|daytona sp3|f80)\\b',
      'porsche (?:718|boxster|cayman|carrera gt|918)\\b',
      'audi r8\\b',
      '(?:acura|honda) nsx\\b',
      'bmw i8\\b',
      'lotus (?:98 )?(?:elise|exige|evora|emira|europa|esprit)\\b',
      'alfa romeo 4c\\b',
      'ford gt(?: |$)',
      'toyota mr2\\b',
      'maserati (?:mc20|mcpura|gt2 stradale)\\b',
      'aston martin (?:valkyrie|valhalla)\\b',
      'mercedes-benz amg one\\b',
    ].join('|') +
    ')',
);

/** The 911 in every name EPA gave it ("Carrera 4 S Coupe", "Turbo 4 911"), and the smart fortwo. */
const REAR_ENGINE = /^(?:porsche (?:new )?(?:911|carrera [24]|targa|turbo)\b|smart fortwo\b)/;

/** Where the engine sits; undefined for cars with no engine (electric and fuel-cell cars). */
export function enginePosition(car: CarSpecs): EnginePosition | undefined {
  const fuel = car.engine.fuelType;
  if (fuel === 'electric' || fuel === 'hydrogen') return undefined;
  const name = `${car.make} ${car.model}`.toLowerCase();
  // The Corvette went mid-engined with the 2020 C8.
  if (MID_ENGINE.test(name) || (/^chevrolet corvette\b/.test(name) && car.year >= 2020)) {
    return 'mid';
  }
  return REAR_ENGINE.test(name) ? 'rear' : 'front';
}
