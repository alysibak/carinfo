/**
 * Turning the camera's picture into what the VIN readers read: the part
 * inside the guide on screen, at the camera's full resolution, made larger
 * and stronger in contrast. The whole frame gave the barcode reader a small,
 * distant barcode and the character reader a page of everything else.
 */

/** Where on the camera's own picture a box drawn over the video sits. */
export function guideCrop(
  video: { videoWidth: number; videoHeight: number },
  shown: DOMRect,
  guide: DOMRect,
  /** A margin round the box, as a share of its size: a VIN at its edge is still read. */
  margin = 0.12,
): { x: number; y: number; width: number; height: number } | null {
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh || !shown.width || !shown.height) return null;
  // The video fills its frame and is cut at the sides or top (object-cover).
  const scale = Math.max(shown.width / vw, shown.height / vh);
  const offsetX = (shown.width - vw * scale) / 2;
  const offsetY = (shown.height - vh * scale) / 2;
  const left = (guide.left - shown.left - offsetX) / scale;
  const top = (guide.top - shown.top - offsetY) / scale;
  const width = guide.width / scale;
  const height = guide.height / scale;
  // Each edge moved out by the margin, then kept inside the picture.
  const x = Math.max(0, left - width * margin);
  const y = Math.max(0, top - height * margin);
  const right = Math.min(vw, left + width * (1 + margin));
  const bottom = Math.min(vh, top + height * (1 + margin));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/** A region of an image drawn onto a canvas of the given width. */
export function drawRegion(
  source: CanvasImageSource,
  region: { x: number; y: number; width: number; height: number },
  width: number,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
): HTMLCanvasElement {
  const height = Math.max(1, Math.round((region.height / region.width) * width));
  canvas.width = Math.round(width);
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

function greyOf(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const grey = new Uint8ClampedArray(pixels.length / 4);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    grey[p] = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
  }
  return grey;
}

/** Grey values stretched to full contrast (the darkest and lightest few
 * hundredths black and white), inverted when asked, written back as pixels. */
function stretchInto(grey: Uint8ClampedArray, pixels: Uint8ClampedArray, invert: boolean): void {
  const histogram = new Uint32Array(256);
  for (const value of grey) histogram[value] += 1;
  const cut = grey.length * 0.02;
  let low = 0;
  for (let sum = 0; low < 255 && sum + histogram[low] < cut; low++) sum += histogram[low];
  let high = 255;
  for (let sum = 0; high > 0 && sum + histogram[high] < cut; high--) sum += histogram[high];
  const span = Math.max(1, high - low);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    let value = ((grey[p] - low) * 255) / span;
    if (invert) value = 255 - value;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
  }
}

/**
 * Grey, stretched to full contrast, and inverted when asked: a VIN stamped
 * light on dark reads better turned dark on light.
 */
export function strengthen(canvas: HTMLCanvasElement, invert = false): HTMLCanvasElement {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || !canvas.width || !canvas.height) return canvas;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  stretchInto(greyOf(image.data), image.data, invert);
  context.putImageData(image, 0, 0);
  return canvas;
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
  canvas: HTMLCanvasElement,
  lightPrint: boolean,
  /** Wider than a character's stroke, narrower than its plate. */
  radius = Math.max(6, Math.round(canvas.height / 14)),
): HTMLCanvasElement {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || !canvas.width || !canvas.height) return canvas;
  const { width, height } = canvas;
  const image = context.getImageData(0, 0, width, height);
  const grey = greyOf(image.data);
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
  const pixels = image.data;
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255 - (Math.min(full, strokes[p]) * 255) / full;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
