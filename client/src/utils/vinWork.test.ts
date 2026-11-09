import { describe, expect, it } from 'vitest';
import { barcodeIn, prepareForReading, slantIn } from './vinWork';

/** RGBA pixels of a white picture with a dark bar across it. */
function picture(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = Math.floor(height / 2) - 4; y < Math.floor(height / 2) + 4; y++) {
    for (let x = 20; x < width - 20; x++) {
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 10;
    }
  }
  return { data, width, height };
}

// No workers here, as in a browser that cannot start one: the work runs in place.
describe('without workers', () => {
  it('readies a picture for the reader as a PGM file', async () => {
    const prepared = await prepareForReading(picture(200, 40), 0);
    const header = new TextDecoder().decode(prepared.pgm.slice(0, 11));
    expect(header).toBe('P5\n200 40\n2');
    expect(prepared.slant).toBe(0);
  });

  it('measures a slant', async () => {
    expect(await slantIn(picture(200, 40))).toBe(0);
  });

  it('reads no barcode where there is none', async () => {
    expect(await barcodeIn(picture(200, 40))).toBeNull();
  });
});
