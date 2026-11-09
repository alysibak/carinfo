/**
 * Readying a picture's pixels for the character reader, with no page or
 * canvas needed, so it can all run off the main thread (see vinWork): made
 * grey, set level where the print runs at a slant, brought out one of three
 * ways (PASSES), then written as the plain grey image file the reader takes in.
 */

/** Grey values from the RGBA pixels a canvas gives. */
export function greyOf(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const grey = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    grey[p] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  }
  return grey;
}

/** Grey values stretched to full contrast: the darkest and lightest few hundredths black and white. */
export function stretched(grey: Uint8ClampedArray): Uint8ClampedArray {
  const histogram = new Uint32Array(256);
  for (const value of grey) histogram[value] += 1;
  const cut = grey.length * 0.02;
  let low = 0;
  for (let sum = 0; low < 255 && sum + histogram[low] < cut; low++) sum += histogram[low];
  let high = 255;
  for (let sum = 0; high > 0 && sum + histogram[high] < cut; high--) sum += histogram[high];
  const span = Math.max(1, high - low);
  const out = new Uint8ClampedArray(grey.length);
  for (let p = 0; p < grey.length; p++) out[p] = ((grey[p] - low) * 255) / span;
  return out;
}

/**
 * The least (or greatest) value within `radius` of each, along one direction:
 * rows when `step` is 1, columns when it is the width. A queue keeps it to one
 * look at each value, however wide the window.
 */
function slide(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  lines: number,
  length: number,
  step: number,
  lineStep: number,
  radius: number,
  greatest: boolean,
): void {
  const queue = new Int32Array(length);
  for (let line = 0; line < lines; line++) {
    const base = line * lineStep;
    let head = 0;
    let tail = 0;
    let added = 0;
    for (let i = 0; i < length; i++) {
      for (const end = Math.min(length - 1, i + radius); added <= end; added++) {
        const value = source[base + added * step];
        while (tail > head) {
          const last = source[base + queue[tail - 1] * step];
          if (greatest ? last > value : last < value) break;
          tail--;
        }
        queue[tail++] = added;
      }
      while (queue[head] < i - radius) head++;
      target[base + i * step] = source[base + queue[head] * step];
    }
  }
}

/** A square of `radius` each way: the least value in it (erode) or the greatest (dilate). */
function square(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  greatest: boolean,
): Uint8ClampedArray {
  const rows = new Uint8ClampedArray(grey.length);
  const out = new Uint8ClampedArray(grey.length);
  slide(grey, rows, height, width, 1, width, radius, greatest);
  slide(rows, out, width, height, width, 1, radius, greatest);
  return out;
}

/**
 * The least contrast the boldest strokes are stretched from, out of 255: a
 * picture with no print in it stays faint, not its noise made loud, which
 * the reader reads as letters.
 */
const LEAST_STROKE = 40;

/**
 * Only the characters, dark on white. Strokes thinner than a square of the
 * given size are kept and everything broader dropped: the plate or label they
 * sit on, the dashboard round it, a glare across the windshield. (A top-hat,
 * or for dark print a black-hat.) Where print is faint on a plate that stands
 * out from its surroundings, reading the whole crop's contrast loses the
 * print in the plate; this does not.
 */
export function strokesOnly(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
  lightPrint: boolean,
  /** Wider than a character's stroke, narrower than its plate. */
  radius = Math.max(6, Math.round(height / 14)),
): Uint8ClampedArray {
  // Light print: what an opening (erode, then dilate) takes away. Dark print:
  // what a closing (dilate, then erode) fills in.
  const first = square(grey, width, height, radius, !lightPrint);
  const background = square(first, width, height, radius, lightPrint);
  const strokes = new Uint8ClampedArray(grey.length);
  const histogram = new Uint32Array(256);
  for (let p = 0; p < grey.length; p++) {
    strokes[p] = lightPrint ? grey[p] - background[p] : background[p] - grey[p];
    histogram[strokes[p]] += 1;
  }
  // Most of the picture is now nothing. The boldest strokes (the top two in
  // a thousand pixels) are made black, the rest in proportion, on white.
  let peak = 255;
  for (let sum = 0, cut = grey.length * 0.002; peak > 0 && sum + histogram[peak] < cut; peak--) {
    sum += histogram[peak];
  }
  const full = Math.max(LEAST_STROKE, peak);
  const out = new Uint8ClampedArray(grey.length);
  for (let p = 0; p < grey.length; p++) out[p] = 255 - (Math.min(full, strokes[p]) * 255) / full;
  return out;
}

/**
 * Three ways to ready a picture for the character reader, taken in turn:
 * the whole of it in full contrast (a clean sticker); only its dark strokes
 * (print on a label, or on a bright plate under glare); only its light ones (a
 * VIN stamped light on a dark plate). Each reads VINs the others miss.
 */
export const PASSES: Array<
  (grey: Uint8ClampedArray, width: number, height: number) => Uint8ClampedArray
> = [
  (grey) => stretched(grey),
  (grey, width, height) => strokesOnly(grey, width, height, false),
  (grey, width, height) => strokesOnly(grey, width, height, true),
];

/** The steepest slant looked for, in degrees: a VIN steeper than this the person can straighten. */
const STEEPEST = 15;
/** Under this many degrees the reader copes as it is, and turning the picture only blurs it. */
const LEVEL_ENOUGH = 1.5;

/**
 * How many degrees the print in a picture rises to the right: the angle at
 * which its edges (where brightness changes sharply: the strokes' sides, the
 * plate's or label's outline, which runs the same way) bunch into the fewest,
 * fullest lines, as rows of characters do. Edges, not dark pixels: a dark
 * dashboard round a plate is all dark and no edge, and print may be light or
 * dark. 0 when it is level enough already, or when nothing stands out.
 */
export function slantOf(grey: Uint8ClampedArray, width: number, height: number): number {
  // Every pixel of a few hundred across is plenty to judge by.
  const step = Math.max(1, Math.floor(width / 360));
  const points: number[] = [];
  const strengths: number[] = [];
  for (let y = 0; y + step < height; y += step) {
    for (let x = 0; x + step < width; x += step) {
      const here = grey[y * width + x];
      const strength =
        Math.abs(grey[y * width + x + step] - here) + Math.abs(grey[(y + step) * width + x] - here);
      if (strength < 24) continue;
      points.push(x, y);
      strengths.push(strength);
    }
  }
  // The strongest edges only: the print and its plate, not grain.
  const sorted = [...strengths].sort((a, b) => b - a);
  const cutoff = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const ink: number[] = [];
  for (let i = 0; i < strengths.length; i++) {
    if (strengths[i] >= cutoff) ink.push(points[2 * i], points[2 * i + 1]);
  }
  const sampled = Math.floor(width / step) * Math.floor(height / step);
  if (ink.length / 2 < Math.max(40, sampled * 0.003)) return 0;
  // Lines as far apart as the points are: narrower, and level ones (along the
  // rows the points were taken from) came out fuller than any other, a bias
  // that once beat print at 8 degrees.
  const lines = new Float64Array(Math.ceil(Math.hypot(width, height) / step) + 2);
  const score = (degrees: number) => {
    const sin = Math.sin((degrees * Math.PI) / 180);
    const cos = Math.cos((degrees * Math.PI) / 180);
    lines.fill(0);
    for (let i = 0; i < ink.length; i += 2) {
      // Which line, at this slant, the point lies on.
      lines[Math.round((ink[i + 1] * cos + ink[i] * sin + width * Math.abs(sin)) / step)] += 1;
    }
    let sum = 0;
    for (const count of lines) sum += count * count;
    return sum;
  };
  let best = 0;
  let bestScore = score(0);
  const level = bestScore;
  for (let degrees = -STEEPEST; degrees <= STEEPEST; degrees += 1) {
    const at = score(degrees);
    if (at > bestScore) {
      best = degrees;
      bestScore = at;
    }
  }
  for (let degrees = best - 0.75; degrees <= best + 0.75; degrees += 0.25) {
    const at = score(degrees);
    if (at > bestScore) {
      best = degrees;
      bestScore = at;
    }
  }
  // A slant is said only when it lines the print up clearly better than level.
  if (Math.abs(best) < LEVEL_ENOUGH || bestScore < level * 1.1) return 0;
  return best;
}

/**
 * The picture turned about its middle so print rising to the right at
 * `degrees` runs level; what the turn brings in from beyond its edges, the
 * nearest edge's own shade, so no false edge is made there.
 */
export function levelled(
  grey: Uint8ClampedArray,
  width: number,
  height: number,
  degrees: number,
): Uint8ClampedArray {
  const sin = Math.sin((degrees * Math.PI) / 180);
  const cos = Math.cos((degrees * Math.PI) / 180);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const out = new Uint8ClampedArray(grey.length);
  const at = (x: number, y: number) =>
    grey[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  for (let v = 0; v < height; v++) {
    for (let u = 0; u < width; u++) {
      // Where in the slanted picture this level pixel comes from.
      const x = cx + (u - cx) * cos + (v - cy) * sin;
      const y = cy - (u - cx) * sin + (v - cy) * cos;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      out[v * width + u] =
        (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) +
        (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
    }
  }
  return out;
}

/** Grey values as a PGM file: the plainest image the reader opens, with nothing to encode. */
export function toPgm(grey: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const header = new TextEncoder().encode(`P5\n${width} ${height}\n255\n`);
  const file = new Uint8Array(header.length + grey.length);
  file.set(header);
  file.set(grey, header.length);
  return file;
}
