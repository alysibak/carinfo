import { nativeBarcodeReader } from './vinBarcodeNative';
import type { Pixels, Prepared } from './vinWork.core';

/** The same work, here: loaded only where a worker cannot start, or for the browser's own barcode reader. */
const here = () => import('./vinWork.core');

/**
 * The VIN scanner's heavy work, off the main thread: two workers, one
 * readying pictures for the character reader and one reading barcodes, so
 * neither waits on the other. On the main thread, a phone spent more than half
 * of each second on this, and the camera stuttered under the person's fingers.
 * Where a browser cannot start a worker, the same work runs here.
 */

type Lane = 'prepare' | 'barcode';

const lanes = new Map<Lane, Worker | null>();
const waiting = new Map<
  number,
  { lane: Lane; resolve: (out: never) => void; reject: (error: Error) => void }
>();
let lastId = 0;

function failLane(lane: Lane, worker: Worker): void {
  worker.terminate();
  lanes.set(lane, null);
  for (const [id, job] of waiting) {
    if (job.lane !== lane) continue;
    waiting.delete(id);
    job.reject(new Error('The worker stopped'));
  }
}

function laneWorker(lane: Lane): Worker | null {
  if (lanes.has(lane)) return lanes.get(lane) ?? null;
  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL('./vinWork.worker.ts', import.meta.url), { type: 'module' });
    const started = worker;
    started.onmessage = ({ data }: MessageEvent<{ id: number; out?: never; error?: string }>) => {
      const job = waiting.get(data.id);
      if (!job) return;
      waiting.delete(data.id);
      if (data.error !== undefined) job.reject(new Error(data.error));
      else job.resolve(data.out as never);
    };
    // A worker that will not load or crashes: its lane's work runs here from then on.
    started.onerror = () => failLane(lane, started);
  } catch {
    worker = null;
  }
  lanes.set(lane, worker);
  return worker;
}

function run<T>(
  lane: Lane,
  job: Record<string, unknown>,
  pixels: Pixels,
  here: () => T | Promise<T>,
): Promise<T> {
  const worker = laneWorker(lane);
  if (!worker) return Promise.resolve().then(here);
  const id = ++lastId;
  return new Promise<T>((resolve, reject) => {
    waiting.set(id, { lane, resolve: resolve as (out: never) => void, reject });
    // The pixels are handed over, not copied: they are the caller's no longer.
    worker.postMessage(
      { ...job, id, pixels: { data: pixels.data, width: pixels.width, height: pixels.height } },
      [pixels.data.buffer],
    );
  });
}

/** A picture readied for the character reader (see prepare in vinWork.core). */
export function prepareForReading(pixels: Pixels, pass: number): Promise<Prepared> {
  return run('prepare', { kind: 'prepare', pass }, pixels, async () =>
    (await here()).prepare(pixels, pass),
  );
}

/** How many degrees the print in a picture rises to the right (see slantOf in vinPixels). */
export function slantIn(pixels: Pixels): Promise<number> {
  return run('prepare', { kind: 'slant' }, pixels, async () => (await here()).slantIn(pixels));
}

/**
 * The barcode in a picture. The browser's own reader, where it has one, works
 * outside the page already and is asked from here; zxing runs in a worker.
 */
export async function barcodeIn(pixels: Pixels): Promise<string | null> {
  const native = await nativeBarcodeReader();
  if (native) {
    try {
      const [first] = await native.detect(new ImageData(pixels.data, pixels.width, pixels.height));
      return first?.rawValue ?? null;
    } catch {
      return null;
    }
  }
  return run('barcode', { kind: 'barcode' }, pixels, async () => (await here()).barcodeIn(pixels));
}

/** Stops the workers, and with them any work still waiting: the camera has closed. */
export function stopVinWork(): void {
  for (const worker of lanes.values()) worker?.terminate();
  lanes.clear();
  for (const job of waiting.values()) job.reject(new Error('Stopped'));
  waiting.clear();
}
