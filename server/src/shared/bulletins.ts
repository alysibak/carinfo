/**
 * The makers' technical service bulletins, as NHTSA files them: their repair
 * instructions to dealers for problems they know about. A bulletin is not a
 * recall; some extend a part's warranty or announce a free repair program.
 */

export type BulletinKind = 'warranty' | 'program';

/** Coverage made longer than the car's own warranty: "WARRANTY EXTENSION", "SPECIAL COVERAGE". */
const WARRANTY =
  /\b(?:WARRANTY\s+(?:EXTENSION|ENHANCEMENT|ADJUSTMENT)|EXTENDED\s+(?:LIMITED\s+)?(?:WARRANTY|COVERAGE)|SPECIAL\s+COVERAGE|EXTENDS?\s+(?:THE\s+)?(?:[A-Z]+\s+)?(?:WARRANTY|COVERAGE))\b/i;
/** A repair the maker does for free, outside any recall: "CUSTOMER SATISFACTION PROGRAM". */
const PROGRAM =
  /\b(?:CUSTOMER\s+SATISFACTION\s+(?:PROGRAM|CAMPAIGN)|PRODUCT\s+IMPROVEMENT\s+(?:CAMPAIGN|PROGRAM)|LIMITED\s+SERVICE\s+CAMPAIGN|SERVICE\s+CAMPAIGN)\b/i;
/** "This bulletin is not a warranty extension": said, not done. */
const DENIED =
  /\b(?:NOT|NO)\s+(?:AN?\s+)?(?:[A-Z]+\s+){0,2}(?:WARRANTY\s+EXTENSION|EXTENDED\s+WARRANTY|SPECIAL\s+COVERAGE|CAMPAIGN)\b/i;

/** A warranty extension or free repair program, from the bulletin's own words; none for the rest. */
export function bulletinKind(summary: string): BulletinKind | undefined {
  if (DENIED.test(summary)) return undefined;
  if (WARRANTY.test(summary)) return 'warranty';
  if (PROGRAM.test(summary)) return 'program';
  return undefined;
}

/** The system a bulletin's component belongs to: "POWER TRAIN" of "POWER TRAIN:AUTOMATIC TRANSMISSION". */
export function bulletinSystem(component: string): string {
  return component.split(':')[0].trim() || 'UNKNOWN OR OTHER';
}

/**
 * The shop's abbreviations, kept in capitals when a summary is put in
 * sentence case. Words that are also plain English ("can", "map", "am") are
 * left out: lowercase reads right for those far more often.
 */
const ABBREVIATIONS = new Set([
  '2WD',
  '4WD',
  'A/C',
  'AC',
  'ABS',
  'ACC',
  'ADAS',
  'AEB',
  'AM/FM',
  'AWD',
  'BCM',
  'BMS',
  'CD',
  'CVT',
  'DC',
  'DEF',
  'DPF',
  'DTC',
  'DTCS',
  'DVD',
  'ECM',
  'ECU',
  'EGR',
  'EPS',
  'ESC',
  'EV',
  'EVAP',
  'FCW',
  'FWD',
  'GPS',
  'HEV',
  'HID',
  'HUD',
  'HV',
  'HVAC',
  'IPC',
  'LCD',
  'LED',
  'MIL',
  'NHTSA',
  'OBD',
  'OEM',
  'PCM',
  'PCV',
  'PHEV',
  'RPM',
  'RWD',
  'SCR',
  'SRS',
  'SUV',
  'TCM',
  'TIPM',
  'TPMS',
  'TSB',
  'U.S.',
  'USA',
  'USB',
  'VIN',
  'VSA',
  'VSC',
]);

/**
 * A bulletin's summary in sentence case where NHTSA has it in capitals:
 * "SOME 2016 CIVIC VEHICLES MAY HAVE A CVT JUDDER. REPROGRAM THE PCM." reads
 * "Some 2016 Civic vehicles may have a CVT judder. Reprogram the PCM." Codes
 * and numbers ("P0420", "19-001", "2.0L") and the shop's abbreviations stay
 * as written; `names` (the make and model) keep their own spelling.
 */
export function bulletinText(text: string, names: string[] = []): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (/[a-z]/.test(clean)) return clean;
  const spelled = new Map(
    names
      .flatMap((name) => name.split(/\s+/))
      .filter(Boolean)
      .map((word) => [word.toUpperCase(), word]),
  );
  const words = clean.replace(/[A-Z0-9][A-Z0-9/'.&+-]*/g, (word) => {
    const bare = word.replace(/[.,;:]+$/, '');
    const tail = word.slice(bare.length);
    const name = spelled.get(bare);
    if (name) return name + tail;
    if (/\d/.test(bare) || ABBREVIATIONS.has(bare)) return word;
    return word.toLowerCase();
  });
  return words
    .replace(/\bi\b/g, 'I')
    .replace(
      /(^|[.!?]\s+)([a-z])/g,
      (_, lead: string, letter: string) => lead + letter.toUpperCase(),
    );
}
