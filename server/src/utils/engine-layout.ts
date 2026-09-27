import type { CarSpecs } from '../types/car.types.js';
import { isPorsche911 } from './porsche-911.js';

/**
 * The engine's layout ("I4", "V6", "Flat-6", "W12", "Rotary"), or undefined
 * when it is not known.
 *
 * EPA records a cylinder count, never a layout, and the database was built by
 * guessing one from the count alone: every six was an "I6" (a V6 Camry's page
 * read "3.0L I6"), every five a "V5", Subaru's boxers "I4", Bentley's W12s
 * "V12", Bugatti's W16 a "V16" and Mazda's rotaries "I2". The layout follows
 * the engine family instead, and a six from a maker not listed here stays a
 * count ("6-cyl") rather than a guess.
 */
export function engineLayout(car: CarSpecs): string | undefined {
  const n = car.engine.cylinders;
  if (!n || n < 1) return undefined;
  const make = car.make.toLowerCase();
  const model = car.model.toLowerCase();
  if (make === 'mazda' && /^rx-?[78]\b/.test(model)) return 'Rotary';
  if (n <= 3) return `I${n}`;
  if (n === 4) return isFlatFour(make, model) ? 'Flat-4' : 'I4';
  // Every five-cylinder sold here is an inline five (Audi, Volvo, VW, GM's Atlas).
  if (n === 5) return 'I5';
  if (n === 6) return sixLayout(car, make, model);
  if (n === 8) return make === 'volkswagen' && /^passat\b/.test(model) ? 'W8' : 'V8';
  if (n === 12) {
    if (make === 'bentley' || /^(phaeton|a8)\b/.test(model)) return 'W12';
    if (make === 'ferrari' && /\bf?512 ?m\b|testarossa/.test(model)) return 'Flat-12';
    return 'V12';
  }
  if (n === 16) return 'W16';
  return `V${n}`;
}

function isFlatFour(make: string, model: string): boolean {
  if (make === 'subaru') return true;
  // Toyota's and Scion's 86 share the BRZ's boxer; Porsche's 718 went to four in 2017.
  if ((make === 'toyota' || make === 'scion') && /^(gr ?86|86|fr-s)\b/.test(model)) return true;
  return make === 'porsche' && /\b(718|boxster|cayman)\b/.test(model);
}

/** Makers whose sixes in these years were all V6s, apart from the rules below. */
const V6_MAKES = new Set([
  'acura',
  'alfa romeo',
  'bentley',
  'buick',
  'cadillac',
  'chevrolet',
  'chrysler',
  'dodge',
  'eagle',
  'ferrari',
  'ford',
  'genesis',
  'gmc',
  'honda',
  'hyundai',
  'infiniti',
  'isuzu',
  'jeep',
  'kia',
  'lexus',
  'lincoln',
  'lotus',
  'maserati',
  'mazda',
  'mclaren automotive',
  'mercury',
  'mitsubishi',
  'nissan',
  'oldsmobile',
  'plymouth',
  'pontiac',
  'ram',
  'saab',
  'saturn',
  'suzuki',
  'toyota',
]);

function sixLayout(car: CarSpecs, make: string, model: string): string | undefined {
  const litres = car.engine.displacement ?? 0;
  const fuel = car.engine.fuelType;
  const gasoline = fuel === 'gasoline';
  const year = car.year;

  // Boxers.
  if (make === 'subaru' || make === 'ruf automobile') return 'Flat-6';
  if (make === 'porsche') {
    return isPorsche911(car) || /\b(718|boxster|cayman)\b/.test(model) ? 'Flat-6' : 'V6';
  }
  // Straight sixes.
  if (make === 'bmw' || make === 'volvo' || make === 'ineos automotive') return 'I6';
  if (make === 'aston martin') return 'I6'; // The DB7's supercharged 3.2.
  if (make === 'daewoo' || (make === 'suzuki' && /^verona\b/.test(model))) return 'I6';
  if (make === 'toyota' && (/^supra\b/.test(model) || litres === 4.5)) return 'I6';
  if (make === 'lexus' && (litres === 4.5 || (/^(gs|is|sc) ?300\b/.test(model) && year <= 2005))) {
    return 'I6';
  }
  if (make === 'ford' && litres === 4.9) return 'I6';
  // GM's 4.2 Atlas (Trailblazer, Envoy, Rainier, Bravada, Ascender, 9-7X)
  // and its 3.0 Duramax diesel.
  if (/^(chevrolet|gmc|buick|oldsmobile|isuzu|saab)$/.test(make) && litres === 4.2) return 'I6';
  if (/^(chevrolet|gmc|cadillac)$/.test(make) && fuel === 'diesel' && litres === 3) return 'I6';
  // Jeep's 4.0, and Stellantis's 3.0 Hurricane (Wagoneer, Ram 1500, the 2025 Charger).
  if (make === 'jeep' && (litres === 4 || (gasoline && litres === 3))) return 'I6';
  if (make === 'ram' && gasoline && litres === 3) return 'I6';
  if (make === 'dodge' && gasoline && litres === 3 && year >= 2025) return 'I6';
  if (make === 'mazda' && litres === 3.3) return 'I6';
  // Mercedes, Jaguar and Land Rover went from V6s to straight sixes with a
  // 48 V system from 2018: the mild hybrids, and the plug-ins from 2021.
  const newStraightSix =
    year >= 2018 && (car.engine.mildHybrid === true || (fuel === 'plug-in hybrid' && year >= 2021));
  if (make === 'mercedes-benz') {
    if (year <= 1997) return 'I6';
    if (year <= 1999) return fuel === 'diesel' || /^s ?320\b|^sl ?320\b/.test(model) ? 'I6' : 'V6';
    return newStraightSix ? 'I6' : 'V6';
  }
  if (make === 'jaguar') return year <= 1997 || newStraightSix ? 'I6' : 'V6';
  if (make === 'land rover') return /^lr2\b/.test(model) || newStraightSix ? 'I6' : 'V6';
  // Volkswagen's narrow-angle VR6, bar the Routan's Chrysler V6, the TDI and
  // the 1998-2005 Passat's Audi V6; Audi's own in the A3, TT and first Q7.
  if (make === 'volkswagen') {
    const audiV6Passat = litres === 2.8 && year >= 1998 && /^passat\b/.test(model);
    if (/^routan\b/.test(model) || fuel === 'diesel' || audiV6Passat) {
      return 'V6';
    }
    return 'VR6';
  }
  if (make === 'audi') {
    return (litres === 3.2 && /^(a3|tt)\b/.test(model)) || (litres === 3.6 && /^q7\b/.test(model))
      ? 'VR6'
      : 'V6';
  }
  return V6_MAKES.has(make) ? 'V6' : undefined;
}
