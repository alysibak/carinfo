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
  /**
   * Read in a word a character longer, with one cut out where the reader's
   * own boxes show it does not belong: one glyph read twice, or a stray mark
   * at an end (see withoutStrays).
   */
  trimmed?: boolean;
  /**
   * What was read, before any change. Two different misreads that come out
   * the same VIN are evidence of it; one misread repeated (a still picture
   * misread the same way each frame) is not.
   */
  raw?: string;
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

/** Text in the VIN alphabet: I, O and Q (never in a VIN) as the 1 and 0 they are mistaken for. */
function inVinAlphabet(text: string): string {
  return text
    .toUpperCase()
    .replace(/[IO]/g, (c) => (c === 'I' ? '1' : '0'))
    .replace(/Q/g, '0');
}

/** A reader's text in the VIN alphabet: a list of words for each line. */
function vinWords(text: string): string[][] {
  return inVinAlphabet(text)
    .split(/\n+/)
    .map((line) => line.split(/[^A-Z0-9]+/).filter(Boolean));
}

/** A character the reader read, and its box on the picture. */
export interface ReadSymbol {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const median = (values: number[]) =>
  values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : 0;

/**
 * A word as it would read without a character that, by the reader's own
 * boxes, does not belong: one of two boxes over the same place (one glyph
 * read twice, the commonest way a read comes out a character long), or a mark
 * at an end standing well apart from the evenly spaced rest, or far shorter
 * (a plate's edge, a dash). Each way it could go. The boxes are rough (now
 * and then one spans several characters, and those are left out of it), so
 * they only ever offer a read, never rule one out.
 */
export function withoutStrays(symbols: ReadSymbol[]): string[] {
  const count = symbols.length;
  if (count < 3) return [];
  const width = (s: ReadSymbol) => s.x1 - s.x0;
  const height = (s: ReadSymbol) => s.y1 - s.y0;
  const pitch = median(symbols.map(width));
  const plausible = (s: ReadSymbol) => width(s) <= 1.6 * pitch;
  const drop = new Set<number>();
  for (let i = 0; i + 1 < count; i++) {
    const [a, b] = [symbols[i], symbols[i + 1]];
    if (!plausible(a) || !plausible(b)) continue;
    const overlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    if (overlap > 0.4 * Math.min(width(a), width(b))) {
      drop.add(i);
      drop.add(i + 1);
    }
  }
  const gaps = symbols.slice(1).map((s, i) => s.x0 - symbols[i].x1);
  const gap = Math.max(0, median(gaps.slice(1, -1)));
  const tall = median(symbols.map(height));
  const apart = (space: number) => space > Math.max(2 * gap, gap + pitch / 2);
  if (apart(gaps[0]) || height(symbols[0]) < 0.6 * tall) drop.add(0);
  if (apart(gaps[count - 2]) || height(symbols[count - 1]) < 0.6 * tall) drop.add(count - 1);
  return [...drop].map((i) =>
    inVinAlphabet(
      symbols
        .filter((_, j) => j !== i)
        .map((s) => s.text)
        .join(''),
    ),
  );
}

/** Runs of whole neighbouring words, each as long as it can be up to `most` characters. */
function wordRuns(words: string[], most: number): string[] {
  const runs: string[] = [];
  for (let start = 0; start < words.length; start++) {
    let run = '';
    for (let end = start; end < words.length && run.length + words[end].length <= most; end++) {
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
 * where the reader saw gaps in it; that may be corrected (see correctVin).
 * Given the reader's boxes for its words (`boxed`), a word a character long
 * with one shown not to belong is taken too, where what is left checks out
 * exactly as read. Never a stretch cut from a line of words run together: a
 * sticker's other lines, sliced, now and then check out. The likeliest come
 * first.
 */
export function vinsFromText(text: string, boxed: ReadSymbol[][] = []): VinRead[] {
  const found = new Map<string, VinRead>();
  const rank = (read: VinRead) => (asItStands(read) ? 0 : 1) * 100 + read.changed.length;
  const keep = (read: VinRead | null, raw: string, trimmed = false) => {
    if (!read) return;
    const taken: VinRead = trimmed ? { ...read, trimmed, raw } : { ...read, raw };
    const known = found.get(taken.vin);
    if (!known || rank(taken) < rank(known)) found.set(taken.vin, taken);
  };
  for (const symbols of boxed) {
    if (symbols.length !== 18) continue;
    const raw = inVinAlphabet(symbols.map((s) => s.text).join(''));
    for (const word of withoutStrays(symbols)) {
      const read = correctVin(word);
      if (read?.changed.length === 0) keep(read, raw, true);
    }
  }
  for (const words of vinWords(text)) {
    for (let start = 0; start < words.length; start++) {
      let run = '';
      for (let end = start; end < words.length; end++) {
        if (end > start && (words[end].length < 3 || words[end - 1].length < 3)) break;
        run += words[end];
        if (run.length > 17) break;
        if (run.length === 17) keep(correctVin(run), run);
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
 * whole and as it stands, twice. Corrected or trimmed, three times, and by
 * two different reads at least: a still picture misread the same way each
 * frame, then a look-alike swapped (a guess among a score), came out a wrong
 * VIN that checked out. Trimmed alone, four times: what is cut is shown by the
 * reader's own boxes, and what is left checks out with nothing changed.
 */
export class VinTally {
  private counts = new Map<
    string,
    { exact: number; likely: number; trims: number; raws: Set<string>; changed: number[] }
  >();

  add(reads: VinRead[]): VinRead | null {
    for (const read of reads) {
      const entry = this.counts.get(read.vin) ?? {
        exact: 0,
        likely: 0,
        trims: 0,
        raws: new Set<string>(),
        changed: read.changed,
      };
      if (asItStands(read)) entry.exact += 1;
      else entry.likely += 1;
      if (read.trimmed && read.changed.length === 0) entry.trims += 1;
      entry.raws.add(read.raw ?? read.vin);
      if (read.changed.length < entry.changed.length) entry.changed = read.changed;
      this.counts.set(read.vin, entry);
      if (entry.exact >= 2) return { vin: read.vin, changed: [] };
      if (entry.trims >= 4) return { vin: read.vin, changed: [], trimmed: true };
      if (entry.exact + entry.likely >= 3 && entry.raws.size >= 2) {
        // Never read as it stands, nor with a character changed: trimmed.
        const trimmed = entry.exact === 0 && entry.changed.length === 0;
        return trimmed
          ? { vin: read.vin, changed: [], trimmed }
          : { vin: read.vin, changed: entry.changed };
      }
    }
    return null;
  }

  clear(): void {
    this.counts.clear();
  }
}

/**
 * The VIN in one photo, read in several ways (each a list of reads): one read
 * whole and as it stands, in the most ways; else one that two different reads
 * agree on; else one corrected or trimmed. `sure` when it is one of the first
 * two, so no more ways need trying.
 */
export function bestOfPasses(passes: VinRead[][]): { read: VinRead; sure: boolean } | null {
  const seen = new Map<
    string,
    { read: VinRead; times: number; raws: Set<string>; standing: boolean }
  >();
  for (const reads of passes) {
    for (const read of reads) {
      const raw = read.raw ?? read.vin;
      const entry = seen.get(read.vin);
      if (!entry) {
        seen.set(read.vin, { read, times: 1, raws: new Set([raw]), standing: asItStands(read) });
        continue;
      }
      entry.times += 1;
      entry.raws.add(raw);
      entry.standing ||= asItStands(read);
      if (read.changed.length < entry.read.changed.length) entry.read = read;
    }
  }
  const rank = (entry: { times: number; raws: Set<string>; standing: boolean }) =>
    entry.standing ? 0 : entry.raws.size >= 2 ? 1 : 2;
  const [best] = [...seen.values()].sort((a, b) => rank(a) - rank(b) || b.times - a.times);
  if (!best) return null;
  const { vin, changed, trimmed } = best.read;
  return {
    read: best.standing
      ? { vin, changed: [] }
      : trimmed && changed.length === 0
        ? { vin, changed, trimmed }
        : { vin, changed },
    sure: rank(best) < 2,
  };
}
