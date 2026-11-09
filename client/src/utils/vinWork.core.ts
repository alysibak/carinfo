import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import { nativeBarcodeReader } from './vinBarcodeNative';
import { greyOf, levelled, PASSES, slantOf, toPgm } from './vinPixels';

/**
 * The VIN scanner's heavy work on a picture's pixels: readying them for the
 * character reader, and reading a barcode. Run in a worker (vinWork.worker.ts)
 * so the camera and its controls stay smooth; here too, where a browser has
 * no workers.
 */

/** RGBA pixels, as a canvas's getImageData gives them. */
export interface Pixels {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

/** A picture readied for the character reader: a PGM file, and how far it was turned to set it level. */
export interface Prepared {
  pgm: Uint8Array;
  slant: number;
}

/**
 * Set level where the print still runs at a slant (judged on the picture as
 * it is, the same for every way of readying it), then readied one of the ways
 * (see PASSES). The slant it found comes back: the caller draws the next
 * picture turned by it, which keeps more of small print than turning here.
 */
export function prepare(pixels: Pixels, pass: number): Prepared {
  const { width, height } = pixels;
  let grey = greyOf(pixels.data);
  const slant = slantOf(grey, width, height);
  if (slant !== 0) grey = levelled(grey, width, height, slant);
  grey = PASSES[pass % PASSES.length](grey, width, height);
  return { pgm: toPgm(grey, width, height), slant };
}

/** How many degrees the print in a picture rises to the right (see slantOf). */
export function slantIn(pixels: Pixels): number {
  return slantOf(greyOf(pixels.data), pixels.width, pixels.height);
}

/** Formats VINs ship in: Code 39 on door stickers, Code 128 on some windshield
 * labels, Data Matrix / QR on newer plates, PDF417 on registration papers. */
const ZXING_FORMATS = [
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_128,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.PDF_417,
];

let zxing: MultiFormatReader | null = null;

/** The barcode in a picture, read by the browser's own reader or else by zxing. */
export async function barcodeIn(pixels: Pixels): Promise<string | null> {
  const detector = await nativeBarcodeReader();
  if (detector) {
    try {
      const image = new ImageData(pixels.data, pixels.width, pixels.height);
      const [first] = await detector.detect(image);
      return first?.rawValue ?? null;
    } catch {
      return null;
    }
  }
  if (!zxing) {
    zxing = new MultiFormatReader();
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    zxing.setHints(hints);
  }
  const source = new RGBLuminanceSource(greyOf(pixels.data), pixels.width, pixels.height);
  try {
    return zxing.decodeWithState(new BinaryBitmap(new HybridBinarizer(source))).getText();
  } catch {
    return null;
  } finally {
    zxing.reset();
  }
}
