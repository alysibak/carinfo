import type { ImageLike, Worker } from 'tesseract.js';
import { cutByEdge, VIN_CHARS, withinFrame, type ReadSymbol, type ReadWord } from './vinOcr';

/**
 * The character reader the VIN scanner runs on camera frames and photos:
 * Tesseract, in a worker of its own so the camera never stutters, served from
 * the site (see vite.config.ts) and told to read only the characters a VIN
 * uses. Its first start fetches about 7 MB; the browser keeps the letters'
 * data for next time.
 *
 * Shared: the VIN page holds it while open, loading it before the camera is
 * asked for, and the camera holds it while it runs (see holdVinReader). It is
 * let go of, its memory freed, once neither does; a phone has little to spare.
 */
let starting: Promise<Worker> | null = null;

/** Where the reader is: what the camera says while it waits on it. */
export type ReaderStage = 'idle' | 'downloading' | 'setting up' | 'ready' | 'failed';

let stage: ReaderStage = 'idle';
const watchers = new Set<(stage: ReaderStage) => void>();

function reached(next: ReaderStage): void {
  if (stage === next) return;
  stage = next;
  for (const watcher of watchers) watcher(next);
}

/** Calls `watcher` with the reader's stage now and whenever it changes; returns the way to stop. */
export function watchVinReader(watcher: (stage: ReaderStage) => void): () => void {
  watchers.add(watcher);
  watcher(stage);
  return () => {
    watchers.delete(watcher);
  };
}

export function startVinReader(): Promise<Worker> {
  starting ??= (async () => {
    reached('downloading');
    const { createWorker, OEM, PSM } = await import('tesseract.js');
    const worker = await createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr',
      langPath: '/ocr',
      workerBlobURL: false,
      // Its files are in; what is left is setting it up.
      logger: (message: { status: string }) => {
        if (message.status === 'initializing api') reached('setting up');
      },
    });
    await worker.setParameters({
      tessedit_char_whitelist: VIN_CHARS,
      // A block of lines: a sticker's VIN sits among other words.
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    reached('ready');
    return worker;
  })();
  const current = starting;
  // A failed start may be tried again.
  current.catch(() => {
    if (starting === current) starting = null;
    reached('failed');
  });
  return current;
}

async function stopVinReader(): Promise<void> {
  const current = starting;
  starting = null;
  reached('idle');
  if (!current) return;
  try {
    await (await current).terminate();
  } catch {
    // It never started.
  }
}

let holders = 0;

/**
 * Starts the reader if it is not running and keeps it running until the
 * returned function is called, and nothing else holds it.
 */
export function holdVinReader(): () => void {
  holders += 1;
  startVinReader().catch(() => {});
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holders -= 1;
    if (holders === 0) void stopVinReader();
  };
}

/** What the reader read in an image. */
export interface PageRead {
  /** Its text, without the words the picture's edge cuts through (see withinFrame). */
  text: string;
  /** The boxes of its longer words, inside the picture (see withoutStrays). */
  boxed: ReadSymbol[][];
  /** All it read, words at the edge too: what the camera shows it sees so far. */
  seen: string;
  /** Print like a VIN's runs past the picture's left or right edge. */
  cut: boolean;
}

/** How wide a picture is: a canvas, or a PGM file (its header gives it). */
function widthOf(image: HTMLCanvasElement | Uint8Array): number {
  if (!(image instanceof Uint8Array)) return image.width;
  const header = new TextDecoder().decode(image.subarray(0, 32)).split(/\s+/);
  return header[0] === 'P5' ? Number(header[1]) || 0 : 0;
}

/** What the reader read in a picture: a canvas, or an image file's bytes (see vinPixels' toPgm). */
export async function readText(image: HTMLCanvasElement | Uint8Array): Promise<PageRead> {
  const worker = await startVinReader();
  // Its loader passes bytes it does not take for a file of its own straight
  // to its image library, which opens a PGM; its types name only Node's Buffer.
  const { data } = await worker.recognize(image as ImageLike, {}, { text: true, blocks: true });
  const seen = data.text ?? '';
  const width = widthOf(image);
  const lines: ReadWord[][] = [];
  const boxed: ReadSymbol[][] = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        lines.push(line.words.map(({ text, bbox }) => ({ text, x0: bbox.x0, x1: bbox.x1 })));
        for (const word of line.words) {
          // Only words a VIN could be, as read or a character long.
          if (word.symbols.length < 17 || word.symbols.length > 18) continue;
          if (
            width > 0 &&
            cutByEdge({ text: word.text, x0: word.bbox.x0, x1: word.bbox.x1 }, width)
          )
            continue;
          boxed.push(
            word.symbols.map(({ text, bbox }) => ({
              text,
              x0: bbox.x0,
              x1: bbox.x1,
              y0: bbox.y0,
              y1: bbox.y1,
            })),
          );
        }
      }
    }
  }
  if (width === 0 || lines.length === 0) return { text: seen, boxed, seen, cut: false };
  const { text, cut } = withinFrame(lines, width);
  return { text, boxed, seen, cut };
}
