import type { CarSpecs } from '../types/car.types.js';

/**
 * Engine names shoppers search by, read from what EPA records: the make, fuel,
 * cylinders, displacement and induction. "hemi" matched a Tesla Model 3
 * "Premium" and a Cruze "Premier"; "ecoboost" found one Mustang.
 */
export type EngineFamilyId =
  'hemi' | 'ecoboost' | 'coyote' | 'power-stroke' | 'duramax' | 'ecodiesel' | 'tdi';

interface EngineFamily {
  /** For the results page: "Read as …". */
  label: string;
  test: (car: CarSpecs) => boolean;
}

const makeIn = (car: CarSpecs, makes: string[]) => makes.includes(car.make.toLowerCase());
const litres = (car: CarSpecs) => car.engine.displacement ?? 0;

export const ENGINE_FAMILIES: Record<EngineFamilyId, EngineFamily> = {
  // 5.7, 6.1, 6.2 and 6.4 L V8s; 2004 on, as the 5.9 Magnum V8 left after 2003.
  hemi: {
    label: 'the Hemi V8s (5.7 litres and up) in Chrysler, Dodge, Jeep and Ram models from 2004',
    test: (c) =>
      makeIn(c, ['chrysler', 'dodge', 'jeep', 'ram']) &&
      c.engine.cylinders === 8 &&
      litres(c) >= 5.6 &&
      c.year >= 2004,
  },
  ecoboost: {
    label: "Ford's turbocharged EcoBoost gasoline engines",
    test: (c) =>
      makeIn(c, ['ford']) &&
      (c.engine.fuelType === 'gasoline' || c.engine.fuelType === 'hybrid') &&
      (c.engine.aspiration === 'turbocharged' ||
        c.engine.aspiration === 'turbocharged and supercharged'),
  },
  coyote: {
    label: "Ford's 5.0-litre Coyote V8, 2011 on",
    test: (c) =>
      makeIn(c, ['ford']) &&
      c.engine.cylinders === 8 &&
      Math.abs(litres(c) - 5) < 0.15 &&
      c.year >= 2011,
  },
  'power-stroke': {
    label: "Ford's Power Stroke diesels",
    test: (c) => makeIn(c, ['ford']) && c.engine.fuelType === 'diesel',
  },
  // The 2.8 four and 3.0 six; the Cruze's and Equinox's 1.6 and 2.0 were not Duramaxes.
  duramax: {
    label: "GM's Duramax diesels",
    test: (c) =>
      makeIn(c, ['chevrolet', 'gmc', 'cadillac']) &&
      c.engine.fuelType === 'diesel' &&
      litres(c) >= 2.7,
  },
  ecodiesel: {
    label: 'the 3.0-litre EcoDiesel V6 in Ram and Jeep models',
    test: (c) =>
      makeIn(c, ['ram', 'jeep', 'dodge']) &&
      c.engine.fuelType === 'diesel' &&
      Math.abs(litres(c) - 3) < 0.15,
  },
  tdi: {
    label: 'Volkswagen and Audi TDI diesels',
    test: (c) => makeIn(c, ['volkswagen', 'audi']) && c.engine.fuelType === 'diesel',
  },
};

export function isEngineFamilyId(value: unknown): value is EngineFamilyId {
  return typeof value === 'string' && value in ENGINE_FAMILIES;
}
