import type { Car } from '../types/car.types.js';

/**
 * Government records name vehicles their own way: NHTSA's and Transport
 * Canada's "F-150", "4 RUNNER", "MAZDA3", "ES350" or "GRAND CARAVAN" are the
 * site's F-150, 4Runner, Mazda 3, ES and Caravan/Grand Caravan. This finds
 * the site's model line ("ford|f150") for one such name in one model year,
 * or null when the site lists no such vehicle that year (a heavy-duty F-250,
 * which EPA does not rate, is not an F-150).
 */

const compact = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

/** Makes the records spell otherwise than the site does. */
const MAKE_ALIASES: Record<string, string> = {
  'mercedes benz': 'Mercedes-Benz',
  mercedes: 'Mercedes-Benz',
  'rolls royce': 'Rolls-Royce',
  chevy: 'Chevrolet',
  vw: 'Volkswagen',
  'mini cooper': 'MINI',
};

/** Words after a line's name that leave it the same line: "SILVERADO 1500", "IONIQ HYBRID". */
const SAME_LINE_AFTER = /^(?:\d|hybrid|plugin|phev|hev|ev|electric|awd|4wd|2wd|fwd|rwd|4x4|4x2)/;
/** Words that name a body, not a model. */
const BODY_WORDS =
  /^(?:pickup|truck|van|wagon|sedan|coupe|convertible|hatchback|suv|cab|chassis|cargo|passenger)$/;
/** A performance trim the records name as a model: "MUSTANG GT", "CIVIC SI", "CAMARO SS". */
const PERFORMANCE_TRIM = /^(?:gt|gts|si|ss|rs|st|svt|typer)$/;
/** A heavy-duty version, which EPA does not rate: "SIERRA 3500", "SILVERADO 2500HD". */
const HEAVY_DUTY = /^(?:[2-5]500|hd|sd)/;
/** Words after a record's name in an EPA model name that leave it the same vehicle: "Yukon XL 2WD". */
const DRIVE_OR_BODY_AFTER =
  /^(?:awd|4wd|2wd|fwd|rwd|4x4|4x2|ffv|cng|hybrid|wagon|sedan|coupe|convertible|hatchback|van|pickup)/;

interface Line {
  key: string;
  /** The line's own name, compacted: "f150", "grandcherokee", "3series". */
  name: string;
  /** Its EPA model names that year, compacted: "328i", "caravangrandcaravan2wd". */
  models: Set<string>;
  /** The words of those names: "golf", "gti". */
  words: Set<string>;
}

export interface GovModelIndex {
  /** The site's model line for a government make, model and model year, or null. */
  match(make: string, model: string, year: number): string | null;
}

export function govModelIndex(cars: readonly Car[], lineOf: (car: Car) => string): GovModelIndex {
  const makes = new Map<string, string>();
  const lines = new Map<string, Map<string, Line>>();
  for (const car of cars) {
    makes.set(car.make.toLowerCase(), car.make);
    const key = lineOf(car);
    const where = `${car.make.toLowerCase()}|${car.year}`;
    const byKey = lines.get(where) ?? new Map<string, Line>();
    lines.set(where, byKey);
    const line = byKey.get(key) ?? {
      key,
      name: compact(key.slice(key.indexOf('|') + 1)),
      models: new Set<string>(),
      words: new Set<string>(),
    };
    line.models.add(compact(car.model));
    for (const w of car.model.toLowerCase().split(/[^a-z0-9-]+/)) if (w) line.words.add(w);
    byKey.set(key, line);
  }
  const cache = new Map<string, string | null>();

  function find(make: string, model: string, year: number): string | null {
    const lower = make.toLowerCase().trim();
    const ourMake = MAKE_ALIASES[lower] ?? makes.get(lower);
    if (!ourMake) return null;
    const candidates = [...(lines.get(`${ourMake.toLowerCase()}|${year}`)?.values() ?? [])];
    if (!candidates.length) return null;
    const name = compact(model);
    // "MAZDA3", "MAZDA CX-5": the make written into the model's name.
    const makeWord = compact(ourMake);
    const names = [
      name,
      name.startsWith(makeWord) ? name.slice(makeWord.length) : '',
      // Transport Canada's "C CLASS", "GLE CLASS": the site's C and GLE.
      name.endsWith('class') && name.length > 5 ? name.slice(0, -5) : '',
    ].filter(Boolean);
    for (const n of names) {
      const byName = candidates.find((line) => line.name === n);
      if (byName) return byName.key;
    }
    for (const n of names) {
      const byModel = candidates.find((line) => line.models.has(n));
      if (byModel) return byModel.key;
    }
    // Acura's "3.2TL", "1.6EL": the engine size before the name.
    for (const n of names) {
      const sized = candidates.filter((line) =>
        [...line.models].some((m) => m.endsWith(n) && /^\d+$/.test(m.slice(0, -n.length))),
      );
      if (sized.length === 1) return sized[0].key;
    }
    // "YUKON XL" is EPA's "Yukon XL 2WD": the name, then only drivetrain or
    // body words. Never digits: "IONIQ" is not the Ioniq 5.
    for (const n of names) {
      const tailed = candidates.filter((line) =>
        [...line.models].some(
          (m) => m.startsWith(n) && DRIVE_OR_BODY_AFTER.test(m.slice(n.length)),
        ),
      );
      if (tailed.length === 1) return tailed[0].key;
    }
    // The longest line name the record's name begins, a number or a
    // drivetrain word following: "C300" the C-Class, "ES350" the ES.
    let best: Line | null = null;
    for (const n of names) {
      for (const line of candidates) {
        if (!n.startsWith(line.name) || line.name.length < 1) continue;
        const rest = n.slice(line.name.length);
        const sameLine = SAME_LINE_AFTER.test(rest) || PERFORMANCE_TRIM.test(rest);
        if (rest && (!sameLine || HEAVY_DUTY.test(rest))) continue;
        if (!best || line.name.length > best.name.length) best = line;
      }
    }
    if (best) return best.key;
    // A name inside a double EPA name: "GRAND CARAVAN" in "Caravan/Grand
    // Caravan 2WD". Not one that begins a longer name ("TRANSIT" is not the
    // Transit Connect), nor a body word ("PICKUP" is not the S10 Pickup).
    if (name.length >= 6 && !BODY_WORDS.test(name)) {
      const within = candidates.filter((line) =>
        [...line.models].some((m) => m.includes(name) && !m.startsWith(name)),
      );
      if (within.length === 1) return within[0].key;
    }
    // A whole word of one line's EPA names: "GTI" in "Golf GTI". Not a body
    // word ("PICKUP" is not the S10 Pickup), and not the start of a longer
    // model's name ("TRANSIT" the van is not the Transit Connect).
    const word = model.toLowerCase().trim();
    if (/^[a-z0-9-]{2,}$/.test(word) && !BODY_WORDS.test(word)) {
      const worded = candidates.filter(
        (line) => line.words.has(word) && !(line.name.startsWith(name) && line.name !== name),
      );
      if (worded.length === 1) return worded[0].key;
    }
    // One word of a longer name that is a line's own name: "C1500 SILVERADO",
    // "CAMARO ZL1", "JETTA TDI DIESEL". Only when one line answers ("COROLLA
    // MATRIX" names two), and never for a heavy-duty version.
    const words = model
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    if (words.length > 1 && !words.some((w) => HEAVY_DUTY.test(w))) {
      const named = candidates.filter((line) => words.includes(line.name));
      if (named.length === 1) return named[0].key;
    }
    return null;
  }

  return {
    match(make, model, year) {
      const id = `${make}|${model}|${year}`;
      if (!cache.has(id)) cache.set(id, find(make, model, year));
      return cache.get(id)!;
    },
  };
}
