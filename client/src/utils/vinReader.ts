import type { Worker } from 'tesseract.js';
import { VIN_CHARS } from './vinOcr';

/**
 * The character reader the VIN scanner runs on camera frames and photos:
 * Tesseract, in a worker of its own so the camera never stutters, served from
 * the site (see vite.config.ts) and told to read only the characters a VIN
 * uses. Its first start fetches about 7 MB; the browser keeps the letters'
 * data for next time.
 */
let starting: Promise<Worker> | null = null;

export function startVinReader(): Promise<Worker> {
  starting ??= (async () => {
    const { createWorker, OEM, PSM } = await import('tesseract.js');
    const worker = await createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr',
      langPath: '/ocr',
      workerBlobURL: false,
    });
    await worker.setParameters({
      tessedit_char_whitelist: VIN_CHARS,
      // A block of lines: a sticker's VIN sits among other words.
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    return worker;
  })();
  // A failed start may be tried again.
  starting.catch(() => {
    starting = null;
  });
  return starting;
}

/** Frees the reader's memory once the camera closes; a phone has little to spare. */
export async function stopVinReader(): Promise<void> {
  const current = starting;
  starting = null;
  if (!current) return;
  try {
    await (await current).terminate();
  } catch {
    // It never started.
  }
}

/** What the reader read in an image, as plain text. */
export async function readText(image: HTMLCanvasElement): Promise<string> {
  const worker = await startVinReader();
  const { data } = await worker.recognize(image);
  return data.text ?? '';
}
