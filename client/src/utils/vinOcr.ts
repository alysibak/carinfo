import { vinCheckDigitValid } from './vin';

/**
 * Reading a VIN from text a camera's character reader returned: a door
 * sticker, the plate through the windshield, a registration. The reader
 * mistakes look-alike characters (S and 5, B and 8), so a read is checked
 * against the VIN's own check digit (its 9th character, which North American
 * VINs all carry) and the rules on where letters and digits may stand, and a
 * look-alike swapped where that alone makes it check out.
 */

/** The VIN alphabet: no I, O or Q, which are too like 1 and 0. */
export const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

/** What a reader may have read in place of each character. */
const LOOK_ALIKES: Record<string, string> = {
  '0': 'D',
  D: '0',
  '1': '7LT',
  '7': '1T',
  T: '71',
  L: '1',
  '2': 'Z',
  Z: '2',
  '3': '8B',
  '5': 'S',
  S: '5',
  '6': 'G',
  G: '6C',
  C: 'G',
  '8': 'B3',
  B: '83',
  '4': 'A',
  A: '4',
  U: 'V',
  V: 'UY',
  Y: 'V',
  M: 'NH',
  N: 'MH',
  H: 'NM',
  E: 'F',
  F: 'E',
  K: 'X',
  X: 'K',
  P: 'R',
  R: 'P',
};

/** A letter read where only a digit can stand. */
const AS_DIGIT: Record<string, string> = {
  D: '0',
  L: '1',
  T: '7',
  Z: '2',
  S: '5',
  G: '6',
  B: '8',
  A: '4',
};

/** Where each position allows: the check digit (9th) is a digit or X; the
 * model year (10th) is never 0, U or Z; the last three are the serial's digits. */
function allowed(char: string, index: number): boolean {
  if (index === 8) return /[0-9X]/.test(char);
  if (index === 9) return !/[0UZ]/.test(char);
  if (index >= 14) return /[0-9]/.test(char);
  return true;
}

export interface VinRead {
  vin: string;
  /** Characters changed from what was read to make it check out. */
  changed: number[];
  /** Read in a word a character or two longer: a stray mark at its end (a plate's edge) cut off. */
  trimmed?: boolean;
}

/** Read whole and as it stands: the surest read there is. */
function asItStands(read: VinRead): boolean {
  return !read.trimmed && read.changed.length === 0;
}

/**
 * The VIN a 17-character read most likely was: as read when it checks out;
 * else with letters where digits must stand made digits, when that makes it
 * check out; else with one look-alike swapped, when exactly one such swap
 * makes the check digit match. Never both: a read that needs a digit made
 * and a swap guessed is more likely not a VIN at all. Null when nothing, or
 * more than one thing, checks out.
 */
export function correctVin(read: string): VinRead | null {
  if (read.length !== 17) return null;
  const chars = read.split('');
  const changed: number[] = [];
  // Where only a digit may stand, a look-alike letter is that digit.
  chars.forEach((char, i) => {
    if (!allowed(char, i) && AS_DIGIT[char] && allowed(AS_DIGIT[char], i)) {
      chars[i] = AS_DIGIT[char];
      changed.push(i);
    }
  });
  if (chars.some((char, i) => !allowed(char, i))) return null;
  const vin = chars.join('');
  if (vinCheckDigitValid(vin)) return { vin, changed };
  if (changed.length > 0) return null;

  // Of the swaps that check out, the likeliest: a letter read for a digit
  // or back (S and 5, B and 8) before one letter for another (E and F); and
  // either before one that puts a letter in the serial at the end, where big
  // makers' VINs have digits. Taken only when one alone is likeliest.
  const fixes: Array<VinRead & { odds: number }> = [];
  chars.forEach((char, i) => {
    for (const alt of LOOK_ALIKES[char] ?? '') {
      if (!allowed(alt, i)) continue;
      const tried = vin.slice(0, i) + alt + vin.slice(i + 1);
      if (!vinCheckDigitValid(tried)) continue;
      const sameKind = /[0-9]/.test(char) === /[0-9]/.test(alt);
      const letterInSerial = i >= 12 && /[A-Z]/.test(alt);
      fixes.push({ vin: tried, changed: [i], odds: (letterInSerial ? 2 : 0) + (sameKind ? 1 : 0) });
    }
  });
  const best = Math.min(...fixes.map((fix) => fix.odds));
  const likely = fixes.filter((fix) => fix.odds === best);
  return likely.length === 1 ? { vin: likely[0].vin, changed: likely[0].changed } : null;
}

/** A reader's text in the VIN alphabet: a list of words for each line. */
function vinWords(text: string): string[][] {
  return text
    .toUpperCase()
    .replace(/[IO]/g, (c) => (c === 'I' ? '1' : '0'))
    .replace(/Q/g, '0')
    .split(/\n+/)
    .map((line) => line.split(/[^A-Z0-9]+/).filter(Boolean));
}

/**
 * Runs of whole neighbouring words up to `most` characters, each word at
 * least `least` long when joined to another.
 */
function wordRuns(words: string[], most: number, least = 1): string[] {
  const runs: string[] = [];
  for (let start = 0; start < words.length; start++) {
    let run = '';
    for (let end = start; end < words.length && run.length + words[end].length <= most; end++) {
      const joining = end > start;
      if (joining && (words[end].length < least || words[end - 1].length < least)) break;
      run += words[end];
      runs.push(run);
    }
  }
  return runs;
}

/** The lines of a reader's text long enough to hold a VIN, spaces closed up. */
export function normalizeOcrText(text: string): string[] {
  return vinWords(text)
    .map((words) => words.join(''))
    .filter((line) => line.length >= 17);
}

/**
 * Every VIN a reader's text holds. A VIN is read whole: a word of 17
 * characters, or up to four neighbouring words of three or more that make 17
 * where the reader saw gaps in it; that may be corrected (see correctVin). A
 * word a character or two longer, a VIN with a stray mark read at an end, is
 * taken where what is left checks out exactly as read. Never a stretch cut
 * from a line of words run together: a sticker's other lines, sliced, now and
 * then check out. The likeliest come first.
 */
export function vinsFromText(text: string): VinRead[] {
  const found = new Map<string, VinRead>();
  const rank = (read: VinRead) => (asItStands(read) ? 0 : 1) * 100 + read.changed.length;
  const keep = (read: VinRead | null) => {
    if (!read) return;
    const known = found.get(read.vin);
    if (!known || rank(read) < rank(known)) found.set(read.vin, read);
  };
  for (const words of vinWords(text)) {
    for (const run of wordRuns(words, 17, 3)) {
      if (run.length === 17) keep(correctVin(run));
    }
    for (const word of words) {
      for (
        let start = 0;
        word.length > 17 && word.length <= 19 && start + 17 <= word.length;
        start++
      ) {
        const read = correctVin(word.slice(start, start + 17));
        if (read?.changed.length === 0) keep({ ...read, trimmed: true });
      }
    }
  }
  return [...found.values()].sort((a, b) => rank(a) - rank(b));
}

/**
 * What the camera sees so far: the longest run of whole words up to 17
 * characters, one with digits (as a VIN has) before one without; or a longer
 * word's first 17 when nothing comes close.
 */
export function bestPartialRead(text: string): string {
  const score = (run: string) => run.length + (/[0-9]/.test(run) ? 100 : 0);
  let best = '';
  for (const words of vinWords(text)) {
    for (const run of wordRuns(words, 17)) if (score(run) > score(best)) best = run;
  }
  if (best.length < 12) {
    const long = vinWords(text)
      .flat()
      .find((word) => word.length > 17);
    if (long) return long.slice(0, 17);
  }
  return best;
}

/**
 * Agreement across a camera's frames: a VIN is taken once it has been read
 * the same way enough times, so one frame's misread is never taken. Read
 * whole and as it stands, twice; corrected or trimmed, three times.
 */
export class VinTally {
  private counts = new Map<string, { exact: number; likely: number; changed: number[] }>();

  add(reads: VinRead[]): VinRead | null {
    for (const read of reads) {
      const entry = this.counts.get(read.vin) ?? { exact: 0, likely: 0, changed: read.changed };
      if (asItStands(read)) entry.exact += 1;
      else entry.likely += 1;
      if (read.changed.length < entry.changed.length) entry.changed = read.changed;
      this.counts.set(read.vin, entry);
      if (entry.exact >= 2) return { vin: read.vin, changed: [] };
      if (entry.exact + entry.likely >= 3) return { vin: read.vin, changed: entry.changed };
    }
    return null;
  }

  clear(): void {
    this.counts.clear();
  }
}

/**
 * The VIN in one photo, read in several ways (each a list of reads): one read
 * whole and as it stands, in the most ways; else one that two ways or more
 * agree on; else one corrected or trimmed. `sure` when it is one of the first
 * two, so no more ways need trying.
 */
export function bestOfPasses(passes: VinRead[][]): { read: VinRead; sure: boolean } | null {
  const seen = new Map<string, { read: VinRead; times: number; standing: boolean }>();
  for (const reads of passes) {
    for (const read of reads) {
      const entry = seen.get(read.vin);
      if (!entry) {
        seen.set(read.vin, { read, times: 1, standing: asItStands(read) });
        continue;
      }
      entry.times += 1;
      entry.standing ||= asItStands(read);
      if (read.changed.length < entry.read.changed.length) entry.read = read;
    }
  }
  const rank = (entry: { times: number; standing: boolean }) =>
    entry.standing ? 0 : entry.times >= 2 ? 1 : 2;
  const [best] = [...seen.values()].sort((a, b) => rank(a) - rank(b) || b.times - a.times);
  if (!best) return null;
  return {
    read: { vin: best.read.vin, changed: best.standing ? [] : best.read.changed },
    sure: rank(best) < 2,
  };
}
