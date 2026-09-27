import type { CarSpecs } from '../types/car.types.js';
import { inferEffectiveFuelType } from './fuel-type-inference.js';

/** A figure, or null where the name does not say which version it is. */
type Rating = number | null;

interface EvPowerRule {
  make: string;
  /** Tested against the lowercased model name. */
  model: RegExp;
  hp: Rating | ((model: string, year: number) => Rating);
}

const suv = (m: string) => /\(suv\)/.test(m);

/**
 * Manufacturers' ratings for electric cars, which EPA does not publish, by
 * trim and year: the one figure per model this replaced put every Taycan at
 * 402 hp (a Turbo S makes 750), every Ioniq 5 at 320, every BMW i model at
 * 335 and a Lucid Air Sapphire at 480 (it makes 1,234). Where a maker quotes
 * a figure with launch control or a boost (Porsche, Audi's e-tron GT, the
 * Ioniq 5 N, Genesis), that is the one used, as the maker headlines it.
 * A name that does not say which version it is gets no figure: EPA's own
 * motor field is no help (a Taycan Turbo S reads "150 and 201 kW").
 *
 * Sources: the makers' US specification pages and press releases, checked
 * against Edmunds, Kelley Blue Book and U.S. News (September 2026).
 */
const EV_POWER_RULES: EvPowerRule[] = [
  // Tesla publishes few figures; these are the ones it or EPA documents gave.
  {
    make: 'tesla',
    model: /^model 3\b/,
    hp: (m, y) => {
      if (/perf/.test(m)) return y >= 2025 ? 510 : y <= 2023 ? 450 : null;
      if (/long range awd/.test(m)) return y <= 2023 ? 346 : null;
      if (/standard range plus|^model 3 rwd$/.test(m)) return y <= 2023 ? 283 : null;
      return null;
    },
  },
  {
    make: 'tesla',
    model: /^model y\b/,
    hp: (m, y) => {
      if (/perf/.test(m)) return y <= 2024 ? 456 : null;
      if (/long range awd$|^model y awd$/.test(m)) return y <= 2024 ? 384 : null;
      return null;
    },
  },
  {
    make: 'tesla',
    model: /^model [sx]\b/,
    hp: (m, y) => (/plaid/.test(m) ? 1020 : y >= 2022 ? 670 : null),
  },
  {
    make: 'tesla',
    model: /^cybertruck\b/,
    hp: (m) => (/beast/.test(m) ? 845 : /awd/.test(m) ? 600 : null),
  },
  {
    make: 'porsche',
    model: /^taycan\b/,
    hp: (m, y) => {
      const late = y >= 2025;
      if (/turbo gt/.test(m)) return 1019;
      if (/turbo s/.test(m)) return late ? 938 : 750;
      if (/turbo/.test(m)) return late ? 871 : 670;
      if (/gts/.test(m)) return late ? 690 : 590;
      const plus = /plus|cross turismo/.test(m);
      if (/\b4s\b/.test(m)) return late ? (plus ? 590 : 536) : plus ? 562 : 522;
      if (/\b4\b/.test(m)) return late ? 429 : 469;
      return late ? (plus ? 429 : 402) : plus ? 469 : 402;
    },
  },
  { make: 'audi', model: /^rs e-tron gt performance/, hp: 912 },
  { make: 'audi', model: /^rs e-tron gt/, hp: (_m, y) => (y <= 2024 ? 637 : null) },
  { make: 'audi', model: /^s e-tron gt/, hp: 670 },
  { make: 'audi', model: /^e-tron gt/, hp: 522 },
  { make: 'audi', model: /^sq8\b|^e-tron s\b/, hp: 496 },
  { make: 'audi', model: /^q8\b.*e-tron|^e-tron\b/, hp: 402 },
  { make: 'audi', model: /^sq6\b/, hp: 509 },
  { make: 'audi', model: /^q6\b.*quattro/, hp: 456 },
  {
    make: 'audi',
    model: /^q4\b/,
    hp: (m) =>
      /\b55\b/.test(m)
        ? 335
        : /\b50\b/.test(m)
          ? 295
          : /\b45\b/.test(m)
            ? 282
            : /\b40\b/.test(m)
              ? 201
              : /quattro/.test(m)
                ? 295
                : 201,
  },
  { make: 'bmw', model: /^i[45] m60\b/, hp: 593 },
  { make: 'bmw', model: /^i4 m50\b/, hp: 536 },
  { make: 'bmw', model: /^i4 xdrive40\b/, hp: 396 },
  { make: 'bmw', model: /^i[45] edrive40\b/, hp: 335 },
  { make: 'bmw', model: /^i4 edrive35\b/, hp: 281 },
  { make: 'bmw', model: /^i5 xdrive40\b/, hp: 389 },
  { make: 'bmw', model: /^i7 m70\b|^ix m70\b/, hp: 650 },
  { make: 'bmw', model: /^i7 xdrive60\b|^ix xdrive60\b/, hp: 536 },
  { make: 'bmw', model: /^i7 edrive50\b/, hp: 449 },
  { make: 'bmw', model: /^ix m60\b/, hp: 610 },
  { make: 'bmw', model: /^ix xdrive50\b/, hp: 516 },
  { make: 'bmw', model: /^ix xdrive45\b/, hp: 402 },
  { make: 'bmw', model: /^ix xdrive40\b/, hp: 322 },
  { make: 'bmw', model: /^ix3 50\b/, hp: 463 },
  { make: 'bmw', model: /^i3s\b/, hp: 181 },
  { make: 'bmw', model: /^i3\b/, hp: 170 },
  { make: 'mercedes-benz', model: /^amg eqs\b/, hp: 649 },
  { make: 'mercedes-benz', model: /^amg eqe\b/, hp: 617 },
  { make: 'mercedes-benz', model: /^eqs 680\b/, hp: 649 },
  { make: 'mercedes-benz', model: /^eqs 580\b/, hp: (m) => (suv(m) ? 536 : 516) },
  { make: 'mercedes-benz', model: /^eqs 450\b/, hp: 355 },
  { make: 'mercedes-benz', model: /^eqe 500\b/, hp: 402 },
  { make: 'mercedes-benz', model: /^eqe 350\b/, hp: 288 },
  { make: 'mercedes-benz', model: /^eqb 250\b/, hp: 188 },
  { make: 'mercedes-benz', model: /^eqb 300\b/, hp: 225 },
  { make: 'mercedes-benz', model: /^eqb 350\b/, hp: 288 },
  { make: 'mercedes-benz', model: /^g 580\b/, hp: 579 },
  { make: 'mercedes-benz', model: /^cla ?250\b/, hp: 268 },
  { make: 'mercedes-benz', model: /^cla ?350\b/, hp: 349 },
  { make: 'mercedes-benz', model: /^b-class electric|^b250e\b/, hp: 177 },
  {
    make: 'hyundai',
    model: /^ioniq 5\b/,
    hp: (m) =>
      /\bn\b/.test(m)
        ? 641
        : /robo ?taxi/.test(m)
          ? null
          : /awd|xrt/.test(m)
            ? 320
            : /standard range/.test(m)
              ? 168
              : 225,
  },
  {
    make: 'hyundai',
    model: /^ioniq 6\b/,
    hp: (m) =>
      /awd/.test(m) ? 320 : /long range/.test(m) ? 225 : /standard range/.test(m) ? 149 : null,
  },
  {
    make: 'hyundai',
    model: /^ioniq 9\b/,
    hp: (m) => (/performance/.test(m) ? 422 : /awd/.test(m) ? 303 : 215),
  },
  {
    make: 'hyundai',
    model: /^kona electric\b/,
    hp: (m, y) =>
      y <= 2023 ? 201 : /standard range/.test(m) ? 133 : /long range/.test(m) ? 201 : null,
  },
  { make: 'hyundai', model: /^ioniq electric\b/, hp: (_m, y) => (y >= 2020 ? 134 : 118) },
  {
    make: 'kia',
    model: /^ev6\b/,
    hp: (m, y) =>
      /\bgt\b/.test(m)
        ? y >= 2025
          ? 601
          : 576
        : /awd/.test(m)
          ? 320
          : /standard range/.test(m)
            ? 167
            : 225,
  },
  {
    make: 'kia',
    model: /^ev9\b/,
    hp: (m) =>
      /^ev9 gt$/.test(m)
        ? 501
        : /awd/.test(m)
          ? 379
          : /long range rwd/.test(m)
            ? 201
            : /standard range/.test(m)
              ? 215
              : null,
  },
  { make: 'kia', model: /^niro (?:ev|electric)\b/, hp: 201 },
  { make: 'kia', model: /^soul (?:ev|electric)\b/, hp: (_m, y) => (y <= 2019 ? 109 : 201) },
  {
    make: 'genesis',
    model: /^gv60\b/,
    hp: (m) => (/performance/.test(m) ? 483 : /rwd/.test(m) ? 225 : 314),
  },
  { make: 'genesis', model: /^electrified gv70\b/, hp: 483 },
  { make: 'genesis', model: /^electrified g80\b/, hp: 365 },
  {
    make: 'ford',
    model: /^mustang mach-e\b/,
    hp: (m) =>
      /\bgt\b|rally/.test(m)
        ? 480
        : /awd/.test(m) && /extended|\ber\b/.test(m)
          ? 346
          : /extended|\ber\b|route 1/.test(m)
            ? 290
            : 266,
  },
  {
    make: 'ford',
    model: /^f-150 lightning\b/,
    hp: (m) => (/extended|\ber\d?\b|platinum/.test(m) ? 580 : 452),
  },
  { make: 'ford', model: /^focus electric\b/, hp: 143 },
  { make: 'chevrolet', model: /^bolt\b/, hp: (_m, y) => (y >= 2027 ? 210 : 200) },
  { make: 'chevrolet', model: /^spark ev\b/, hp: 140 },
  {
    make: 'chevrolet',
    model: /^blazer ev\b/,
    hp: (m) => (/\bss\b/.test(m) ? 615 : /awd/.test(m) ? 288 : /rwd/.test(m) ? 340 : 220),
  },
  {
    make: 'chevrolet',
    model: /^equinox ev\b/,
    hp: (m, y) => (/awd/.test(m) ? 288 : y >= 2025 ? 220 : 213),
  },
  { make: 'gmc', model: /^hummer ev\b.*\b3x\b/, hp: 830 },
  { make: 'gmc', model: /^hummer ev\b.*\b2x\b/, hp: 570 },
  {
    make: 'lucid',
    model: /^air\b/,
    hp: (m) =>
      /sapphire/.test(m)
        ? 1234
        : /dream.*\bp\b|dream.*performance/.test(m)
          ? 1111
          : /\bgt p\b|grand touring performance/.test(m)
            ? 1050
            : /dream.*\br\b|dream.*range/.test(m)
              ? 933
              : /grand touring|g touring|\bgt\b/.test(m)
                ? 819
                : /touring/.test(m)
                  ? 620
                  : /pure/.test(m)
                    ? 430
                    : null,
  },
  { make: 'lucid', model: /^gravity (?:grand touring|gt|dream)\b/, hp: 828 },
  {
    make: 'rivian',
    model: /^r1[ts]\b/,
    hp: (m, y) =>
      /quad/.test(m)
        ? y >= 2025
          ? 1025
          : 835
        : /tri/.test(m)
          ? 850
          : /performance/.test(m)
            ? 665
            : /dual/.test(m)
              ? 533
              : y <= 2022
                ? 835
                : null,
  },
  { make: 'rivian', model: /^r2 performance\b/, hp: 656 },
  {
    make: 'polestar',
    model: /^2\b/,
    hp: (m, y) => {
      if (/perf|bst/.test(m)) return y >= 2024 ? 455 : 476;
      if (/single/.test(m)) return y >= 2024 ? 299 : 231;
      return y >= 2024 ? 421 : 408;
    },
  },
  { make: 'polestar', model: /^3\b.*dual.*perf/, hp: 517 },
  { make: 'polestar', model: /^3\b.*dual/, hp: 489 },
  { make: 'polestar', model: /^4\b.*dual/, hp: 544 },
  { make: 'polestar', model: /^4\b.*single/, hp: 272 },
  {
    make: 'volkswagen',
    model: /^id\.4\b/,
    hp: (m, y) => (/awd/.test(m) ? (y >= 2024 ? 335 : 295) : y >= 2024 ? null : 201),
  },
  { make: 'volkswagen', model: /^id\. ?buzz\b/, hp: (m) => (/4motion/.test(m) ? 335 : 282) },
  { make: 'volkswagen', model: /^e-golf\b/, hp: (_m, y) => (y >= 2017 ? 134 : 115) },
  {
    make: 'nissan',
    model: /^leaf\b/,
    hp: (m, y) => (y >= 2026 ? 214 : y <= 2017 ? 107 : /sv\/sl/.test(m) ? null : 147),
  },
  { make: 'toyota', model: /^bz4x\b/, hp: (m) => (/awd/.test(m) ? 214 : 201) },
  { make: 'toyota', model: /^rav4 ev\b/, hp: (_m, y) => (y >= 2012 ? 154 : null) },
  { make: 'subaru', model: /^solterra\b/, hp: (_m, y) => (y <= 2025 ? 215 : null) },
  { make: 'lexus', model: /^rz 550e\b/, hp: 402 },
  { make: 'lexus', model: /^rz 450e\b/, hp: 308 },
  { make: 'lexus', model: /^rz 350e\b/, hp: 221 },
  { make: 'lexus', model: /^rz 300e\b/, hp: 201 },
  { make: 'honda', model: /^prologue\b/, hp: (m) => (/awd/.test(m) ? 288 : 212) },
  { make: 'honda', model: /^clarity ev\b/, hp: 161 },
  { make: 'honda', model: /^fit ev\b/, hp: 123 },
  {
    make: 'acura',
    model: /^zdx\b/,
    hp: (m) => (/type s/.test(m) ? 499 : /awd/.test(m) ? 490 : 358),
  },
  { make: 'jaguar', model: /^i-pace\b/, hp: 394 },
  {
    make: 'volvo',
    model: /^(?:xc40|c40|ex40|ec40)\b/,
    hp: (m) => (/twin|awd/.test(m) ? 402 : 248),
  },
  { make: 'volvo', model: /^ex30\b/, hp: (m) => (/twin|cross country/.test(m) ? 422 : 268) },
  { make: 'volvo', model: /^ex90\b/, hp: (m) => (/performance/.test(m) ? 510 : 402) },
  { make: 'mini', model: /^cooper se\b/, hp: 181 },
  { make: 'mini', model: /^countryman se\b/, hp: 308 },
  { make: 'fiat', model: /^500e\b/, hp: (_m, y) => (y >= 2024 ? 117 : 111) },
  { make: 'mazda', model: /^mx-30\b/, hp: 143 },
];

export function estimateEvHorsepower(car: CarSpecs): number | null {
  if (inferEffectiveFuelType(car) !== 'electric') return null;
  if (car.engine.horsepower != null && car.engine.horsepower > 0) return null;
  const make = car.make.toLowerCase();
  // EPA's names carry doubled spaces ("Model 3 Long Range  AWD").
  const model = car.model.toLowerCase().replace(/\s+/g, ' ').trim();
  const rule = EV_POWER_RULES.find((r) => r.make === make && r.model.test(model));
  if (!rule) return null;
  return typeof rule.hp === 'function' ? rule.hp(model, car.year) : rule.hp;
}
