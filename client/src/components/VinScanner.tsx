import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { extractVinFromScan, vinCheckDigitValid } from '../utils/vin';
import {
  bestOfPasses,
  bestPartialRead,
  VinTally,
  vinsFromText,
  type VinRead,
} from '../utils/vinOcr';
import { drawRegion, guideCrop, strengthen, strokesOnly } from '../utils/vinFrame';
import { readText, startVinReader, stopVinReader } from '../utils/vinReader';

interface VinScannerProps {
  onDetected: (vin: string) => void;
  onClose: () => void;
}

/** Formats VINs ship in: Code 39 on door stickers, Code 128 on some windshield
 * labels, Data Matrix / QR on newer plates, PDF417 on registration papers. */
const NATIVE_FORMATS = ['code_39', 'code_128', 'data_matrix', 'qr_code', 'pdf417'];

const ZXING_FORMATS = [
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_128,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.PDF_417,
];

type NativeDetectorConstructor = {
  new (options?: { formats?: string[] }): {
    detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
  };
  getSupportedFormats(): Promise<string[]>;
};

type TrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number };
  focusMode?: string[];
};

type Found = VinRead & { source: 'barcode' | 'text' | 'photo' };

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera access is blocked. Allow it for this site in your browser’s settings, or take a photo of the VIN instead.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. Take a photo of the VIN instead, or type it.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is in use by another app. Close it and try again.';
  }
  return 'The camera could not start. Take a photo of the VIN instead, or type it.';
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Three ways to ready a picture for the character reader, taken in turn:
 * the whole of it in full contrast (a clean sticker); only its dark strokes
 * (print on a label, or on a bright plate under glare); only its light ones (a
 * VIN stamped light on a dark plate). Each reads VINs the others miss.
 */
const PASSES: Array<(canvas: HTMLCanvasElement) => HTMLCanvasElement> = [
  (canvas) => strengthen(canvas),
  (canvas) => strokesOnly(canvas, false),
  (canvas) => strokesOnly(canvas, true),
];

/** Barcode reading for a canvas: the browser's own reader where it reads Code 39, else zxing. */
async function makeBarcodeReader(): Promise<(canvas: HTMLCanvasElement) => Promise<string | null>> {
  const Ctor = (globalThis as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector;
  if (Ctor) {
    try {
      const supported = await Ctor.getSupportedFormats();
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      // Without Code 39 it would miss most door stickers.
      if (formats.includes('code_39')) {
        const detector = new Ctor({ formats });
        return async (canvas) => {
          try {
            const [first] = await detector.detect(canvas);
            return first?.rawValue ?? null;
          } catch {
            return null;
          }
        };
      }
    } catch {
      // Fall through to zxing.
    }
  }
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new BrowserMultiFormatReader(hints);
  return async (canvas) => {
    try {
      return reader.decodeFromCanvas(canvas).getText();
    } catch {
      return null;
    }
  };
}

/** The VIN in its three parts, a cell a character, the ones that were unclear marked. */
function VinCells({ vin, changed }: { vin: string; changed: number[] }) {
  const groups = [
    [0, 3],
    [3, 9],
    [9, 17],
  ];
  return (
    <p
      aria-label={vin.split('').join(' ')}
      className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 font-mono text-[1.35rem] sm:text-2xl font-semibold text-white"
    >
      {groups.map(([from, to]) => (
        <span key={from} className="flex gap-px" aria-hidden>
          {vin
            .slice(from, to)
            .split('')
            .map((char, offset) => {
              const unclear = changed.includes(from + offset);
              return (
                <span
                  key={from + offset}
                  className={`w-[1.05em] text-center py-1 ${
                    unclear
                      ? 'bg-amber-400/15 text-amber-200 outline outline-amber-400/60'
                      : 'bg-white/[0.06]'
                  }`}
                >
                  {char}
                </span>
              );
            })}
        </span>
      ))}
    </p>
  );
}

/**
 * The camera, reading the VIN two ways at once: the barcode on a door
 * sticker, and the printed characters (on the sticker, the plate seen
 * through the windshield, or the ownership papers). It reads only inside the
 * guide, at the camera's full resolution; takes a printed VIN once read the
 * same way twice and it checks out against its check digit; then shows it to
 * compare with the car before it is used. A photo, sharper than the live
 * picture, is the way when the live one will not read.
 */
export default function VinScanner({ onDetected, onClose }: VinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const useRefButton = useRef<HTMLButtonElement>(null);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [live, setLive] = useState('');
  const [reader, setReader] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [slow, setSlow] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [canTorch, setCanTorch] = useState(false);
  const [torch, setTorch] = useState(false);
  const [zooms, setZooms] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);

  const trackRef = useRef<MediaStreamTrack | null>(null);
  const pausedRef = useRef(false);
  const tallyRef = useRef(new VinTally());
  const barcodeSeen = useRef(new Map<string, number>());
  const barcodeRef = useRef<((canvas: HTMLCanvasElement) => Promise<string | null>) | null>(null);

  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;

  const accept = useCallback((read: Found) => {
    if (pausedRef.current && read.source !== 'photo') return;
    pausedRef.current = true;
    navigator.vibrate?.(35);
    videoRef.current?.pause();
    setFound(read);
  }, []);

  const scanAgain = () => {
    setFound(null);
    setNote(null);
    setLive('');
    tallyRef.current.clear();
    barcodeSeen.current.clear();
    pausedRef.current = false;
    void videoRef.current?.play().catch(() => {});
  };

  // A barcode's VIN is taken at once where it checks out; one that does not
  // (some from outside North America carry no check digit) once read twice.
  const takeBarcode = useCallback(
    (text: string | null, source: Found['source'] = 'barcode') => {
      const vin = text ? extractVinFromScan(text) : null;
      if (!vin) return false;
      const seen = (barcodeSeen.current.get(vin) ?? 0) + 1;
      barcodeSeen.current.set(vin, seen);
      if (vinCheckDigitValid(vin) || seen >= 2 || source === 'photo') {
        accept({ vin, changed: [], source });
        return true;
      }
      return false;
    },
    [accept],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  // The two readers: barcodes at once, the character reader as it loads.
  useEffect(() => {
    let active = true;
    void makeBarcodeReader().then((read) => {
      if (active) barcodeRef.current = read;
    });
    startVinReader().then(
      () => active && setReader('ready'),
      () => active && setReader('failed'),
    );
    return () => {
      active = false;
      void stopVinReader();
    };
  }, []);

  // The camera: the back one, as sharp as it gives, focusing all the time.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'This browser cannot use the camera here. Take a photo of the VIN instead, or type it.',
      );
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const [track] = stream.getVideoTracks();
        trackRef.current = track ?? null;
        const caps = (track?.getCapabilities?.() ?? {}) as TrackCapabilities;
        if (caps.focusMode?.includes('continuous')) {
          void track
            ?.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
            })
            .catch(() => {});
        }
        setCanTorch(caps.torch === true);
        if (caps.zoom && caps.zoom.max >= 2) {
          setZooms([1, 2, 3].filter((z) => z >= caps.zoom!.min && z <= caps.zoom!.max));
        }
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setRunning(true);
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
      video.srcObject = null;
    };
  }, []);

  // Reading, while the camera runs: barcodes several times a second, the
  // characters as fast as the reader goes, both inside the guide.
  useEffect(() => {
    if (!running) return;
    let stopped = false;
    const crop = () => {
      const video = videoRef.current;
      const frame = frameRef.current;
      const guide = guideRef.current;
      if (!video || !frame || !guide || video.readyState < 2) return null;
      return guideCrop(video, frame.getBoundingClientRect(), guide.getBoundingClientRect());
    };

    let tick = 0;
    const barcodes = window.setInterval(async () => {
      const video = videoRef.current;
      const read = barcodeRef.current;
      if (pausedRef.current || !video || !read) return;
      tick += 1;
      // Mostly the guide, enlarged; now and then the whole picture.
      const region =
        tick % 5 === 0
          ? { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight }
          : crop();
      if (!region) return;
      const canvas = drawRegion(video, region, Math.min(1600, Math.max(900, region.width * 1.5)));
      takeBarcode(await read(canvas));
    }, 220);

    const slowTimer = window.setTimeout(() => setSlow(true), 12000);

    (async () => {
      let frame = 0;
      while (!stopped) {
        const region = crop();
        if (pausedRef.current || reader !== 'ready' || !region || !videoRef.current) {
          await wait(250);
          continue;
        }
        const canvas = PASSES[frame % PASSES.length](drawRegion(videoRef.current, region, 1400));
        frame += 1;
        try {
          const text = await readText(canvas);
          if (stopped || pausedRef.current) continue;
          const partial = bestPartialRead(text);
          if (partial.length >= 4) setLive(partial);
          const taken = tallyRef.current.add(vinsFromText(text));
          if (taken) accept({ ...taken, source: 'text' });
        } catch {
          await wait(500);
        }
        await wait(80);
      }
    })();

    return () => {
      stopped = true;
      window.clearInterval(barcodes);
      window.clearTimeout(slowTimer);
    };
  }, [running, reader, accept, takeBarcode]);

  useEffect(() => {
    if (found) useRefButton.current?.focus();
  }, [found]);

  const setLight = async (on: boolean) => {
    try {
      await trackRef.current?.applyConstraints({
        advanced: [{ torch: on } as MediaTrackConstraintSet],
      });
      setTorch(on);
    } catch {
      setCanTorch(false);
    }
  };

  const setZoomTo = async (value: number) => {
    try {
      await trackRef.current?.applyConstraints({
        advanced: [{ zoom: value } as MediaTrackConstraintSet],
      });
      setZoom(value);
    } catch {
      setZooms([]);
    }
  };

  // A still from the phone's own camera: sharper than the live picture, and
  // focused where the person taps.
  const readPhoto = async (file: File) => {
    pausedRef.current = true;
    setNote(null);
    setReadingPhoto(true);
    // A phone's photo held whole in memory is tens of megabytes: let go of it after.
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      const whole = { x: 0, y: 0, width, height };
      const code = await barcodeRef.current?.(drawRegion(bitmap, whole, Math.min(2000, width)));
      if (takeBarcode(code ?? null, 'photo')) return;
      // The middle of the photo first, where a VIN aimed at sits, read larger
      // and without the rest; then the whole of it. Each in every way, until
      // sure; else the likeliest read (see bestOfPasses).
      const middle = { x: width * 0.05, y: height * 0.3, width: width * 0.9, height: height * 0.4 };
      const passes: VinRead[][] = [];
      for (const region of [middle, whole]) {
        for (const pass of PASSES) {
          passes.push(vinsFromText(await readText(pass(drawRegion(bitmap, region, 2000)))));
          const best = bestOfPasses(passes);
          if (best?.sure) {
            accept({ ...best.read, source: 'photo' });
            return;
          }
        }
      }
      const best = bestOfPasses(passes);
      if (best) {
        accept({ ...best.read, source: 'photo' });
        return;
      }
      setNote(
        'No VIN could be read in that photo. Fill the picture with the VIN, hold steady, and try again, or type it.',
      );
      pausedRef.current = false;
    } catch {
      setNote('That photo could not be read. Try another, or type the VIN.');
      pausedRef.current = false;
    } finally {
      bitmap?.close();
      setReadingPhoto(false);
    }
  };

  const status = readingPhoto
    ? 'Reading the photo…'
    : reader === 'loading'
      ? 'Reading barcodes. Getting the text reader ready…'
      : reader === 'failed'
        ? 'Reading barcodes only: the text reader did not load.'
        : 'Reading the barcode or the printed VIN…';
  const checks = found ? vinCheckDigitValid(found.vin) : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan the VIN"
      className="fixed inset-0 z-300 bg-black flex flex-col"
    >
      <div ref={frameRef} className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Close, what this is, and the light. */}
        <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between gap-2 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-3 bg-linear-to-b from-black/80 to-transparent">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close the camera"
            className="w-11 h-11 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-[15px] font-semibold text-white">Scan the VIN</p>
          {canTorch ? (
            <button
              type="button"
              onClick={() => void setLight(!torch)}
              aria-pressed={torch}
              aria-label="Light"
              className={`w-11 h-11 flex items-center justify-center transition-colors ${
                torch ? 'bg-white text-black' : 'text-white hover:bg-white/10'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  d="M13 2.5L5.5 13.5h6l-1 8 8-11.5h-6z"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span className="w-11" aria-hidden />
          )}
        </div>

        {/* The guide: read only inside it; dim outside. */}
        {!error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[5%] pointer-events-none">
            {/* Above the dimming round the frame, on a plate of its own: over a
                bright sticker, bare text was lost. */}
            <p className="relative z-10 mb-3 px-3 py-1.5 bg-black/75 text-[13px] text-white text-center">
              Fit the VIN in the frame, as large as it will go
            </p>
            <div
              ref={guideRef}
              className="relative w-full max-w-xl aspect-[4.5/1] shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
            >
              {(
                [
                  'top-0 left-0 border-t-[3px] border-l-[3px]',
                  'top-0 right-0 border-t-[3px] border-r-[3px]',
                  'bottom-0 left-0 border-b-[3px] border-l-[3px]',
                  'bottom-0 right-0 border-b-[3px] border-r-[3px]',
                ] as const
              ).map((corner) => (
                <span
                  key={corner}
                  className={`absolute w-6 h-6 ${corner} ${found ? 'border-accent' : 'border-white'}`}
                />
              ))}
              {running && !found && (
                <span className="absolute inset-x-3 h-px bg-accent/80 shadow-[0_0_12px_rgb(52_211_153/0.9)] animate-scan-line motion-reduce:hidden" />
              )}
            </div>
            {/* What it reads so far, a dot a character still to come. */}
            <div className="relative z-10 mt-4 px-4 py-2 bg-black/80 text-center">
              <p
                className="font-mono text-lg tracking-[0.14em] text-white tabular-nums"
                aria-hidden
              >
                {(live + '·'.repeat(17)).slice(0, 17)}
              </p>
              <p role="status" className="mt-0.5 text-xs text-zinc-300">
                {running || readingPhoto ? status : error ? '' : 'Starting the camera…'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <p className="max-w-sm text-sm text-zinc-200 leading-relaxed text-center">{error}</p>
          </div>
        )}

        {/* Closer without moving closer: a blur up close is no read. */}
        {zooms.length > 1 && !found && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
            {zooms.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void setZoomTo(value)}
                aria-pressed={zoom === value}
                className={`min-w-11 h-11 px-3 text-sm font-semibold tabular-nums transition-colors ${
                  zoom === value
                    ? 'bg-white text-black'
                    : 'bg-black/60 text-white border border-white/30'
                }`}
              >
                {value}×
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 bg-black border-t border-zinc-800 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {note && <p className="text-[13px] text-amber-200 leading-snug mb-3">{note}</p>}
        {slow && !note && (
          <ul className="text-[13px] text-zinc-300 leading-snug mb-3 space-y-1">
            <li>
              Hard to read? {canTorch ? 'Turn on the light and hold' : 'Hold'} the phone level with
              the VIN, a hand’s width away.
            </li>
            <li>Tilt it a little to lose the windshield’s glare, or take a photo instead.</li>
          </ul>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={readingPhoto}
            className="btn-secondary flex-1 disabled:opacity-50"
          >
            {readingPhoto ? 'Reading…' : 'Take a photo instead'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost min-h-[44px] shrink-0">
            Type it
          </button>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void readPhoto(file);
          }}
        />
      </div>

      {/* What was read, to set against the car before it is used. */}
      {found && (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/15 bg-zinc-950/95 backdrop-blur-xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] animate-pin-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 text-center">
            {found.source === 'barcode'
              ? 'Read from the barcode'
              : found.source === 'photo'
                ? 'Read from the photo'
                : 'Read from the print'}
          </p>
          <div className="mt-3">
            <VinCells vin={found.vin} changed={found.changed} />
          </div>
          <p
            className={`mt-3 text-[13px] leading-snug text-center max-w-md mx-auto ${
              checks && found.changed.length === 0 ? 'text-accent' : 'text-amber-200'
            }`}
          >
            {!checks
              ? 'Its check digit does not match. Some VINs from outside North America carry none; compare it with the car.'
              : found.changed.length > 0
                ? `${found.changed.length === 1 ? 'One character was' : 'Some characters were'} unclear and set so the check digit matches (marked). Compare it with the car.`
                : 'Its check digit matches. Compare it with the car once.'}
          </p>
          <div className="mt-4 flex gap-2 max-w-md mx-auto">
            <button type="button" onClick={scanAgain} className="btn-secondary flex-1">
              Scan again
            </button>
            <button
              ref={useRefButton}
              type="button"
              onClick={() => onDetectedRef.current(found.vin)}
              className="btn-primary flex-1"
            >
              Use this VIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
