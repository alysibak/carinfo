import { barcodeIn, prepare, slantIn, type Pixels } from './vinWork.core';

/** The VIN scanner's background worker: see vinWork.ts. */

type Job =
  | { id: number; kind: 'prepare'; pixels: Pixels; pass: number }
  | { id: number; kind: 'slant'; pixels: Pixels }
  | { id: number; kind: 'barcode'; pixels: Pixels };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Job>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

scope.onmessage = async ({ data: job }) => {
  try {
    if (job.kind === 'prepare') {
      const out = prepare(job.pixels, job.pass);
      scope.postMessage({ id: job.id, out }, [out.pgm.buffer]);
    } else if (job.kind === 'slant') {
      scope.postMessage({ id: job.id, out: slantIn(job.pixels) });
    } else {
      scope.postMessage({ id: job.id, out: await barcodeIn(job.pixels) });
    }
  } catch (error) {
    scope.postMessage({ id: job.id, error: String(error) });
  }
};
