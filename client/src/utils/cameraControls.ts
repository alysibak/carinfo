/**
 * The camera controls the VIN scanner offers, worked out from what the
 * browser says the camera can do: zoom, the back camera's lenses, and how a
 * picture looks to a reader (too dark, glare, blurred), to say what to change.
 */

/**
 * How far the picture can be zoomed. The camera's own zoom (`own`) reads the
 * sensor's full detail, or moves to a longer lens; where the browser offers
 * none, the picture is enlarged on screen, which still lets a small VIN fill
 * the frame from far enough away for the camera to focus.
 */
export interface ZoomRange {
  min: number;
  max: number;
  own: boolean;
}

/** Enlarged on screen, past this the picture is too coarse to read. */
const SCREEN_ZOOM_MAX = 4;
/** The camera's own zoom past this is the sensor's crop enlarged again. */
const OWN_ZOOM_MAX = 6;

export function zoomRange(capability?: { min?: number; max?: number } | null): ZoomRange {
  if (capability && typeof capability.max === 'number' && capability.max >= 1.5) {
    return {
      min: Math.max(1, capability.min ?? 1),
      max: Math.min(capability.max, OWN_ZOOM_MAX),
      own: true,
    };
  }
  return { min: 1, max: SCREEN_ZOOM_MAX, own: false };
}

/** A zoom within the range, to a tenth. */
export function clampZoom(value: number, range: ZoomRange): number {
  if (!Number.isFinite(value)) return range.min;
  return Math.round(Math.min(range.max, Math.max(range.min, value)) * 10) / 10;
}

/** The zooms offered as buttons, as far as the range goes. */
export function zoomSteps(range: ZoomRange): number[] {
  return [1, 2, 3, 5].filter((step) => step >= range.min && step <= range.max);
}

/** The step whose button stands for a zoom: the largest at or under it. */
export function stepFor(zoom: number, steps: number[]): number | undefined {
  return [...steps].reverse().find((step) => zoom >= step - 0.05);
}

/** One of the back camera's lenses, named as the phone names it. */
export interface Lens {
  deviceId: string;
  name: string;
}

/** A lens's name from the browser's label for it. */
function lensName(label: string, index: number): string {
  if (/ultra\s*wide/i.test(label)) return 'Ultra wide';
  if (/tele/i.test(label)) return 'Telephoto';
  if (/triple/i.test(label)) return 'Triple';
  if (/dual\s*wide/i.test(label)) return 'Dual wide';
  if (/dual/i.test(label)) return 'Dual';
  // An iPhone's main lens is its plain "Back Camera".
  if (/^back camera$/i.test(label.trim())) return 'Main';
  return `Camera ${index + 1}`;
}

/**
 * The cameras worth switching between: those the browser labels as facing
 * back (a phone's lenses); where none is labelled either way (a computer's
 * webcams), all of them. Labels come only once the camera is allowed.
 */
export function backLenses(
  devices: Array<{ kind: string; deviceId: string; label: string }>,
): Lens[] {
  const cameras = devices.filter((device) => device.kind === 'videoinput' && device.deviceId);
  const back = cameras.filter((device) => /back|rear|environment/i.test(device.label));
  const front = cameras.filter((device) => /front|user|facing front|selfie/i.test(device.label));
  const pool = back.length > 0 ? back : cameras.filter((device) => !front.includes(device));
  return pool.map((device, index) => ({
    deviceId: device.deviceId,
    name:
      back.length > 0
        ? lensName(device.label, index)
        : device.label.trim() || `Camera ${index + 1}`,
  }));
}

/** How a picture looks to a reader, from its pixels. */
export interface FrameLook {
  /** Mean brightness, 0 to 255. */
  light: number;
  /** Share of the picture blown out white. */
  glare: number;
  /** Spread of brightness: print on its plate gives plenty, darkness little. */
  contrast: number;
}

export function frameLook(pixels: Uint8ClampedArray, width: number, height: number): FrameLook {
  const count = width * height;
  if (!count) return { light: 0, glare: 0, contrast: 0 };
  let sum = 0;
  let squares = 0;
  let blown = 0;
  for (let i = 0; i < count * 4; i += 4) {
    const value = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
    sum += value;
    squares += value * value;
    if (value >= 250) blown += 1;
  }
  const light = sum / count;
  return {
    light,
    glare: blown / count,
    contrast: Math.sqrt(Math.max(0, squares / count - light * light)),
  };
}

/**
 * What stops a picture being read, where the picture shows it plainly. (Blur
 * does not: a camera's grain looks like fine detail to any measure of it.)
 */
export type Trouble = 'dark' | 'glare';

/**
 * Set against crops of VINs on stickers and plates, clear, dimmed, darkened
 * and under a reflection. Darkened ones average under 30 with little spread
 * (under 15); a black plate's bright print spreads far more, and is no
 * trouble. Clear ones have nothing blown out; a reflection blows out a seventh
 * or so; a white label filling the frame, most of it, and is no reflection.
 */
const DARK_BELOW = 35;
const DARK_SPREAD_BELOW = 18;
const GLARE_ABOVE = 0.08;
const GLARE_BELOW = 0.5;

export function troubleOf(look: FrameLook): Trouble | null {
  if (look.light < DARK_BELOW && look.contrast < DARK_SPREAD_BELOW) return 'dark';
  if (look.glare > GLARE_ABOVE && look.glare < GLARE_BELOW) return 'glare';
  return null;
}

/**
 * A trouble said only once most of the last few frames show it, and unsaid
 * the same way: one dark frame says nothing, and the advice does not flicker.
 */
export class TroubleWatch {
  private recent: Array<Trouble | null> = [];
  private said: Trouble | null = null;

  constructor(
    private readonly frames = 6,
    private readonly needed = 4,
  ) {}

  add(trouble: Trouble | null): Trouble | null {
    this.recent.push(trouble);
    if (this.recent.length > this.frames) this.recent.shift();
    const times = this.recent.filter((seen) => seen === trouble).length;
    if (times >= this.needed) this.said = trouble;
    return this.said;
  }

  clear(): void {
    this.recent = [];
    this.said = null;
  }
}
