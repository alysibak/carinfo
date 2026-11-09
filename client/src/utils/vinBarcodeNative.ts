/**
 * The browser's own barcode reader, where it has one: kept apart from zxing
 * (vinWork.core) so asking after it costs the page nothing to load.
 */

/** Formats VINs ship in: Code 39 on door stickers, Code 128 on some windshield
 * labels, Data Matrix / QR on newer plates, PDF417 on registration papers. */
const NATIVE_FORMATS = ['code_39', 'code_128', 'data_matrix', 'qr_code', 'pdf417'];

type NativeDetector = { detect(source: ImageData): Promise<Array<{ rawValue: string }>> };
type NativeDetectorConstructor = {
  new (options?: { formats?: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
};

let native: Promise<NativeDetector | null> | null = null;

/**
 * The browser's own barcode reader, where it has one that reads Code 39
 * (without it, it would miss most door stickers): Android's, not an iPhone's.
 */
export function nativeBarcodeReader(): Promise<NativeDetector | null> {
  native ??= (async () => {
    const Ctor = (globalThis as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector;
    if (!Ctor) return null;
    try {
      const supported = await Ctor.getSupportedFormats();
      const formats = NATIVE_FORMATS.filter((format) => supported.includes(format));
      return formats.includes('code_39') ? new Ctor({ formats }) : null;
    } catch {
      return null;
    }
  })();
  return native;
}
