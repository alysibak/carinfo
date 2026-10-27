import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
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
import { drawRegion, guideCrop, strengthen, strokesOnly, videoPoint } from '../utils/vinFrame';
import { readText, startVinReader, stopVinReader } from '../utils/vinReader';
import {
  backLenses,
  clampZoom,
  frameLook,
  stepFor,
  TroubleWatch,
  troubleOf,
  zoomRange,
  zoomSteps,
  type Lens,
  type Trouble,
  type ZoomRange,
} from '../utils/cameraControls';

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

type Region = { x: number; y: number; width: number; height: number };

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera access is blocked. Allow it for this site in your browser’s settings, or read a photo of the VIN below.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. Read a photo of the VIN below, or type it.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is in use by another app. Close it and try again.';
  }
  return 'The camera could not start. Read a photo of the VIN below, or type it.';
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
    <p className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 font-mono text-[1.35rem] sm:text-2xl font-semibold text-white">
      {/* Spelled out a character at a time for a screen reader, as it is to be checked. */}
      <span className="sr-only">{vin.split('').join(' ')}</span>
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

const LIGHT_NOTE =
  'This browser can’t turn on the light from a web page. “Phone camera” below opens your camera, where its flash works.';

/** Icons, drawn in the current colour. */
function Icon({
  name,
  className = 'w-6 h-6',
}: {
  name: 'close' | 'light' | 'lens' | 'photos' | 'camera';
  className?: string;
}) {
  const paths = {
    close: <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.8" strokeLinecap="round" />,
    light: <path d="M13 2.5L5.5 13.5h6l-1 8 8-11.5h-6z" strokeWidth="1.6" strokeLinejoin="round" />,
    lens: (
      <path
        d="M4 9a8 8 0 0114.3-3.5M20 15a8 8 0 01-14.3 3.5M18.5 2v4h-4M5.5 22v-4h4"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    photos: (
      <>
        <rect x="3" y="5" width="18" height="14" strokeWidth="1.6" />
        <path d="M3 16l5-5 4 4 3-3 6 6" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="16" cy="9" r="1.5" strokeWidth="1.4" />
      </>
    ),
    camera: (
      <>
        <path d="M3 8h4l2-3h6l2 3h4v11H3z" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="3.5" strokeWidth="1.6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden>
      {paths[name]}
    </svg>
  );
}

/**
 * The camera, reading the VIN two ways at once: the barcode on a door
 * sticker, and the printed characters (on the sticker, the plate seen
 * through the windshield, or the ownership papers). It reads only inside the
 * guide, at the camera's full resolution; takes a printed VIN once read the
 * same way twice and it checks out against its check digit; then shows it to
 * compare with the car before it is used.
 *
 * Its controls are what a camera app has, as far as the browser allows:
 * zoom (pinch, the wheel or the steps; the camera's own where it offers it,
 * else the picture enlarged), the light, focus where tapped, the back
 * camera's other lenses, and advice when the picture is too dark or a
 * reflection lies on the VIN. Where the live picture will not read, a still
 * will: this moment's ("Read now"), one from the phone's photos (a seller's
 * listing), one taken with the phone's own camera (its flash works where the
 * browser cannot light the scene), or one pasted or dropped in.
 */
export default function VinScanner({ onDetected, onClose }: VinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const useRefButton = useRef<HTMLButtonElement>(null);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [live, setLive] = useState('');
  const [reader, setReader] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [slow, setSlow] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<'photo' | 'frame' | null>(null);
  const [canTorch, setCanTorch] = useState(false);
  const [torch, setTorch] = useState(false);
  const [range, setRange] = useState<ZoomRange>(() => zoomRange(null));
  const [zoom, setZoom] = useState(1);
  const [canFocus, setCanFocus] = useState(false);
  const [focusMark, setFocusMark] = useState<{ x: number; y: number; key: number } | null>(null);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [lensId, setLensId] = useState<string | undefined>(undefined);
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [dragging, setDragging] = useState(false);

  const trackRef = useRef<MediaStreamTrack | null>(null);
  const pausedRef = useRef(false);
  const foundRef = useRef<Found | null>(null);
  const tallyRef = useRef(new VinTally());
  const troubleRef = useRef(new TroubleWatch());
  const barcodeSeen = useRef(new Map<string, number>());
  const barcodeRef = useRef<((canvas: HTMLCanvasElement) => Promise<string | null>) | null>(null);
  const rangeRef = useRef(range);
  const zoomRef = useRef(zoom);
  const zoomWanted = useRef<number | null>(null);
  const zoomBusy = useRef(false);
  const pointers = useRef(
    new Map<number, { x: number; y: number; startX: number; startY: number; at: number }>(),
  );
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const pinched = useRef(false);
  const timers = useRef<{ refocus?: number; mark?: number }>({});

  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;
  rangeRef.current = range;
  zoomRef.current = zoom;

  const accept = useCallback((read: Found) => {
    if (foundRef.current) return;
    foundRef.current = read;
    pausedRef.current = true;
    navigator.vibrate?.(35);
    videoRef.current?.pause();
    setFound(read);
  }, []);

  const scanAgain = () => {
    foundRef.current = null;
    setFound(null);
    setNote(null);
    setLive('');
    tallyRef.current.clear();
    troubleRef.current.clear();
    setTrouble(null);
    barcodeSeen.current.clear();
    pausedRef.current = false;
    void videoRef.current?.play().catch(() => {});
  };

  // A barcode's VIN is taken at once where it checks out; one that does not
  // (some from outside North America carry no check digit) once read twice.
  const takeBarcode = useCallback(
    (text: string | null) => {
      const vin = text ? extractVinFromScan(text) : null;
      if (!vin) return false;
      const seen = (barcodeSeen.current.get(vin) ?? 0) + 1;
      barcodeSeen.current.set(vin, seen);
      if (vinCheckDigitValid(vin) || seen >= 2) {
        accept({ vin, changed: [], source: 'barcode' });
        return true;
      }
      return false;
    },
    [accept],
  );

  // Zoom: the camera's own, one request at a time (a pinch asks for dozens),
  // or the picture enlarged on screen.
  const pushZoom = useCallback(async () => {
    if (zoomBusy.current) return;
    zoomBusy.current = true;
    while (zoomWanted.current !== null) {
      const value = zoomWanted.current;
      zoomWanted.current = null;
      try {
        await trackRef.current?.applyConstraints({
          advanced: [{ zoom: value } as MediaTrackConstraintSet],
        });
      } catch {
        // The camera refused after all: enlarge on screen instead.
        rangeRef.current = zoomRange(null);
        setRange(rangeRef.current);
      }
    }
    zoomBusy.current = false;
  }, []);

  const zoomTo = useCallback(
    (value: number) => {
      const next = clampZoom(value, rangeRef.current);
      zoomRef.current = next;
      setZoom(next);
      if (rangeRef.current.own) {
        zoomWanted.current = next;
        void pushZoom();
      }
    },
    [pushZoom],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      else if (e.key === '+' || e.key === '=') zoomTo(zoomRef.current + 0.5);
      else if (e.key === '-') zoomTo(zoomRef.current - 0.5);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const pending = timers.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      window.clearTimeout(pending.refocus);
      window.clearTimeout(pending.mark);
    };
  }, [zoomTo]);

  // The screen kept on while the camera is open: reading a VIN takes a while
  // with the phone held still, and a screen dimming then is the last thing wanted.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let active = true;
    const hold = async () => {
      try {
        const next = await navigator.wakeLock?.request('screen');
        if (!active) void next?.release();
        else lock = next ?? null;
      } catch {
        // Refused (a low battery, an old browser): the screen may dim.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void hold();
    };
    void hold();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => {});
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

  // The camera: the back one (or the lens chosen), as sharp as it gives,
  // focusing all the time.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'This browser cannot use the camera here. Read a photo of the VIN instead, or type it.',
      );
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;

    // What the camera can do. Some phones tell only once asked about photos,
    // or a moment after the picture starts, so it is asked again.
    const learn = async (track: MediaStreamTrack) => {
      const Capture = (
        globalThis as {
          ImageCapture?: new (track: MediaStreamTrack) => {
            getPhotoCapabilities(): Promise<unknown>;
          };
        }
      ).ImageCapture;
      try {
        if (Capture) await new Capture(track).getPhotoCapabilities();
      } catch {
        // Not offered.
      }
      let focusing = false;
      for (const pause of [0, 600, 1400]) {
        await wait(pause);
        if (cancelled || track.readyState !== 'live') return;
        const caps = (track.getCapabilities?.() ?? {}) as TrackCapabilities;
        if (!focusing && caps.focusMode?.includes('continuous')) {
          focusing = true;
          void track
            .applyConstraints({
              advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
            })
            .catch(() => {});
        }
        if (caps.torch === true) setCanTorch(true);
        if (caps.focusMode?.includes('single-shot')) setCanFocus(true);
        const next = zoomRange(caps.zoom);
        if (next.own !== rangeRef.current.own || next.max !== rangeRef.current.max) {
          rangeRef.current = next;
          zoomRef.current = 1;
          setRange(next);
          setZoom(1);
        }
        if (caps.torch && caps.zoom) return;
      }
    };

    (async () => {
      try {
        const size = { width: { ideal: 1920 }, height: { ideal: 1080 } };
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? { deviceId: { exact: deviceId }, ...size }
            : { facingMode: 'environment', ...size },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const [track] = stream.getVideoTracks();
        trackRef.current = track ?? null;
        video.srcObject = stream;
        await video.play();
        if (cancelled || !track) return;
        setRunning(true);
        setLensId(track.getSettings().deviceId);
        // The lenses, by name: a browser names cameras only once one is allowed.
        void navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => !cancelled && setLenses(backLenses(devices)))
          .catch(() => {});
        await learn(track);
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
  }, [deviceId]);

  // Reading, while the camera runs: barcodes several times a second, the
  // characters as fast as the reader goes, both inside the guide; and how the
  // picture looks, to say what to change.
  useEffect(() => {
    if (!running) return;
    let stopped = false;
    const crop = () => {
      const video = videoRef.current;
      const guide = guideRef.current;
      if (!video || !guide || video.readyState < 2) return null;
      // The video's own box: larger than the frame when enlarged on screen.
      return guideCrop(video, video.getBoundingClientRect(), guide.getBoundingClientRect());
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
      const text = await read(canvas);
      if (!pausedRef.current) takeBarcode(text);
    }, 220);

    const slowTimer = window.setTimeout(() => setSlow(true), 10000);

    // How the picture in the guide looks, four times a second: on a timer of
    // its own, as a dark picture's reads come slowly.
    const lookCanvas = document.createElement('canvas');
    const looks = window.setInterval(() => {
      const video = videoRef.current;
      const region = crop();
      if (pausedRef.current || !video || !region) return;
      const look = drawRegion(video, region, 320, lookCanvas)
        .getContext('2d', { willReadFrequently: true })
        ?.getImageData(0, 0, lookCanvas.width, lookCanvas.height);
      if (!look) return;
      setTrouble(troubleRef.current.add(troubleOf(frameLook(look.data, look.width, look.height))));
    }, 250);

    (async () => {
      let frame = 0;
      while (!stopped) {
        const region = crop();
        const video = videoRef.current;
        if (pausedRef.current || reader !== 'ready' || !region || !video) {
          await wait(250);
          continue;
        }
        const canvas = PASSES[frame % PASSES.length](drawRegion(video, region, 1400));
        frame += 1;
        try {
          const page = await readText(canvas);
          if (stopped || pausedRef.current) continue;
          const partial = bestPartialRead(page.text);
          if (partial.length >= 4) setLive(partial);
          const taken = tallyRef.current.add(vinsFromText(page.text, page.boxed));
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
      window.clearInterval(looks);
      window.clearTimeout(slowTimer);
    };
  }, [running, reader, accept, takeBarcode]);

  useEffect(() => {
    if (found) useRefButton.current?.focus();
  }, [found]);

  const toggleLight = async () => {
    if (!canTorch) {
      setNote(LIGHT_NOTE);
      return;
    }
    try {
      await trackRef.current?.applyConstraints({
        advanced: [{ torch: !torch } as MediaTrackConstraintSet],
      });
      setTorch(!torch);
    } catch {
      setCanTorch(false);
      setTorch(false);
      setNote(LIGHT_NOTE);
    }
  };

  // Focus where tapped, then back to following the picture.
  const focusOn = async (clientX: number, clientY: number) => {
    const video = videoRef.current;
    const track = trackRef.current;
    const frame = frameRef.current;
    if (!canFocus || !video || !track || !frame) return;
    const point = videoPoint(video, video.getBoundingClientRect(), clientX, clientY);
    if (!point) return;
    const box = frame.getBoundingClientRect();
    setFocusMark({ x: clientX - box.left, y: clientY - box.top, key: Date.now() });
    window.clearTimeout(timers.current.mark);
    timers.current.mark = window.setTimeout(() => setFocusMark(null), 900);
    window.clearTimeout(timers.current.refocus);
    try {
      await track.applyConstraints({
        advanced: [
          { pointsOfInterest: [point], focusMode: 'single-shot' } as MediaTrackConstraintSet,
        ],
      });
      timers.current.refocus = window.setTimeout(() => {
        void trackRef.current
          ?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
          .catch(() => {});
      }, 3000);
    } catch {
      setCanFocus(false);
      setFocusMark(null);
    }
  };

  // Two fingers zoom; one tap focuses; the wheel zooms on a computer.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const at = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, { ...at, startX: at.x, startY: at.y, at: performance.now() });
    if (pointers.current.size === 1) pinched.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
      pinched.current = true;
    }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointers.current.get(e.pointerId);
    if (!pointer) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 0)
        zoomTo((pinch.current.zoom * distance) / pinch.current.distance);
    }
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const tapped =
      pointer &&
      e.type === 'pointerup' &&
      !pinched.current &&
      pointers.current.size === 0 &&
      Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) < 12 &&
      performance.now() - pointer.at < 400;
    if (tapped) void focusOn(e.clientX, e.clientY);
  };

  const switchLens = () => {
    if (lenses.length < 2) return;
    const at = lenses.findIndex((lens) => lens.deviceId === lensId);
    const next = lenses[(at + 1) % lenses.length];
    setRunning(false);
    setTorch(false);
    setCanTorch(false);
    setCanFocus(false);
    rangeRef.current = zoomRange(null);
    zoomRef.current = 1;
    zoomWanted.current = null;
    setRange(rangeRef.current);
    setZoom(1);
    tallyRef.current.clear();
    troubleRef.current.clear();
    setTrouble(null);
    setLive('');
    setDeviceId(next.deviceId);
  };

  /**
   * A still, read every way: its barcode, then its print, region by region
   * and pass by pass, until sure; else the likeliest read (see bestOfPasses).
   */
  const readStill = useCallback(
    async (source: CanvasImageSource, width: number, height: number, regions: Region[]) => {
      const whole = { x: 0, y: 0, width, height };
      const code = await barcodeRef.current?.(drawRegion(source, whole, Math.min(2000, width)));
      const vin = code ? extractVinFromScan(code) : null;
      if (vin) return { vin, changed: [], source: 'barcode' } as Found;
      const passes: VinRead[][] = [];
      for (const region of regions) {
        for (const pass of PASSES) {
          // As large as the live picture reads best, or a big photo's region
          // brought down to what the reader handles quickly.
          const size = Math.min(2000, Math.max(1400, region.width));
          const page = await readText(pass(drawRegion(source, region, size)));
          passes.push(vinsFromText(page.text, page.boxed));
          const best = bestOfPasses(passes);
          if (best?.sure) return { ...best.read, source: 'text' } as Found;
        }
      }
      const best = bestOfPasses(passes);
      return best ? ({ ...best.read, source: 'text' } as Found) : null;
    },
    [],
  );

  const startStill = (kind: 'photo' | 'frame') => {
    pausedRef.current = true;
    foundRef.current = null;
    setFound(null);
    setNote(null);
    setBusy(kind);
  };

  // A photo: from the phone's camera, its photos, or pasted or dropped in.
  const readPhoto = useCallback(
    async (file: File) => {
      startStill('photo');
      let taken = false;
      // A phone's photo held whole in memory is tens of megabytes: let go of it after.
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        // The middle first, where a VIN aimed at sits, read larger and alone.
        const middle = {
          x: width * 0.05,
          y: height * 0.3,
          width: width * 0.9,
          height: height * 0.4,
        };
        const read = await readStill(bitmap, width, height, [
          middle,
          { x: 0, y: 0, width, height },
        ]);
        if (read) {
          accept({ ...read, source: 'photo' });
          taken = true;
        } else {
          setNote(
            'No VIN could be read in that photo. Fill the picture with the VIN, hold steady, and try again, or type it.',
          );
        }
      } catch {
        setNote('That photo could not be read. Try another, or type the VIN.');
      } finally {
        bitmap?.close();
        setBusy(null);
        if (!taken) {
          pausedRef.current = false;
          void videoRef.current?.play().catch(() => {});
        }
      }
    },
    [accept, readStill],
  );

  // This moment, at the camera's full size, read every way: the guide first.
  const readNow = async () => {
    const video = videoRef.current;
    const guide = guideRef.current;
    if (!video || !guide || video.readyState < 2 || busy) return;
    const { videoWidth: width, videoHeight: height } = video;
    const inGuide = guideCrop(video, video.getBoundingClientRect(), guide.getBoundingClientRect());
    const still = drawRegion(video, { x: 0, y: 0, width, height }, width);
    startStill('frame');
    let taken = false;
    try {
      const whole = { x: 0, y: 0, width, height };
      const read = await readStill(still, width, height, inGuide ? [inGuide, whole] : [whole]);
      if (read) {
        accept(read);
        taken = true;
      } else {
        setNote(
          'No VIN could be read in this picture. Fill the frame with the VIN, hold steady, and try again.',
        );
      }
    } catch {
      setNote('This picture could not be read. Try again, or read a photo instead.');
    } finally {
      setBusy(null);
      if (!taken) pausedRef.current = false;
    }
  };

  // A picture pasted in, on a computer.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      void readPhoto(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [readPhoto]);

  const steps = zoomSteps(range);
  const activeStep = stepFor(zoom, steps);
  const lens = lenses.find((l) => l.deviceId === lensId);
  const troubleText =
    trouble === 'dark'
      ? canTorch && !torch
        ? 'Too dark to read: turn on the light.'
        : 'Too dark to read: use “Phone camera” below, with its flash.'
      : trouble === 'glare'
        ? 'A reflection lies on the VIN: tilt the phone a little.'
        : null;
  const status =
    busy === 'photo'
      ? 'Reading the photo…'
      : busy === 'frame'
        ? 'Reading this picture…'
        : reader === 'loading'
          ? 'Reading barcodes. Getting the text reader ready…'
          : reader === 'failed'
            ? 'Reading barcodes only: the text reader did not load.'
            : (troubleText ?? 'Reading the barcode or the printed VIN…');
  const checks = found ? vinCheckDigitValid(found.vin) : false;
  const takeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void readPhoto(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan the VIN"
      className="fixed inset-0 z-300 bg-black flex flex-col"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
        if (file) void readPhoto(file);
      }}
    >
      <div ref={frameRef} className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          style={!range.own && zoom > 1 ? { transform: `scale(${zoom})` } : undefined}
        />

        {/* Where fingers pinch and tap: under the controls, over the picture. */}
        <div
          className="absolute inset-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onWheel={(e) => zoomTo(zoomRef.current * Math.exp(-e.deltaY / 400))}
        />

        {focusMark && (
          <span
            key={focusMark.key}
            aria-hidden
            className="absolute z-10 w-16 h-16 border-2 border-amber-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-focus-mark motion-reduce:animate-none"
            style={{ left: focusMark.x, top: focusMark.y }}
          />
        )}

        {/* Close, what this is, the lens and the light. */}
        <div className="absolute top-0 inset-x-0 z-10 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-3 bg-linear-to-b from-black/80 to-transparent">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close the camera"
            className="w-11 h-11 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <Icon name="close" />
          </button>
          <p className="text-[15px] font-semibold text-white text-center truncate">Scan the VIN</p>
          <div className="flex items-center">
            {lenses.length > 1 && (
              <button
                type="button"
                onClick={switchLens}
                className="h-11 px-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Icon name="lens" className="w-5 h-5" />
                <span className="sr-only">Switch lens, now </span>
                {lens?.name ?? 'Lens'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggleLight()}
              aria-pressed={canTorch ? torch : undefined}
              className={`relative w-11 h-11 flex items-center justify-center transition-colors ${
                torch
                  ? 'bg-white text-black'
                  : canTorch
                    ? 'text-white hover:bg-white/10'
                    : 'text-zinc-400 hover:bg-white/10'
              }`}
            >
              <Icon name="light" />
              {!canTorch && (
                <span
                  aria-hidden
                  className="absolute w-7 h-0.5 bg-current rotate-45 shadow-[0_0_0_1.5px_black]"
                />
              )}
              <span className="sr-only">{canTorch ? 'Light' : 'Light: not available here'}</span>
            </button>
          </div>
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
              {running && !found && !busy && (
                <span className="absolute inset-x-3 h-px bg-accent/80 shadow-[0_0_12px_rgb(52_211_153/0.9)] animate-scan-line motion-reduce:hidden" />
              )}
            </div>
            {/* What it reads so far, a dot a character still to come, and
                what to change when the picture is the trouble. */}
            <div className="relative z-10 mt-4 px-4 py-2 bg-black/80 text-center max-w-full">
              <p
                className="font-mono text-lg tracking-[0.14em] text-white tabular-nums"
                aria-hidden
              >
                {(live + '·'.repeat(17)).slice(0, 17)}
              </p>
              <p
                role="status"
                className={`mt-0.5 text-xs ${troubleText && !busy && reader === 'ready' ? 'text-amber-200 font-semibold' : 'text-zinc-300'}`}
              >
                {running || busy ? status : error ? '' : 'Starting the camera…'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none">
            <p className="max-w-sm text-sm text-zinc-200 leading-relaxed text-center">{error}</p>
          </div>
        )}

        {/* Closer without moving closer: up close, a phone cannot focus. */}
        {running && !found && (
          <div className="absolute bottom-3 inset-x-0 z-10 flex justify-center gap-2 pointer-events-none">
            {steps.map((step) => {
              const active = activeStep === step;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => zoomTo(step)}
                  aria-pressed={active}
                  className={`pointer-events-auto min-w-11 h-11 px-3 text-sm font-semibold tabular-nums transition-colors ${
                    active ? 'bg-white text-black' : 'bg-black/60 text-white border border-white/30'
                  }`}
                >
                  <span className="sr-only">Zoom </span>
                  {active && zoom !== step ? zoom.toFixed(1) : step}×
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 bg-black border-t border-zinc-800 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {note && (
          <p className="text-[13px] text-amber-200 leading-snug mb-3 text-center max-w-md mx-auto">
            {note}
          </p>
        )}
        {slow && !note && !found && (
          <ul className="text-[13px] text-zinc-300 leading-snug mb-3 space-y-1 max-w-md mx-auto">
            <li>
              Hold the phone level with the VIN, a hand’s width away: closer, it can’t focus. Zoom
              in rather than moving in.
            </li>
            {canFocus && <li>Tap the VIN to focus on it.</li>}
            <li>Tilt it a little to lose the windshield’s glare, or read a photo instead.</li>
          </ul>
        )}
        {/* As a camera app lays them out: photos, the shutter, the camera. */}
        <div className="grid grid-cols-3 items-start max-w-md mx-auto">
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            disabled={!!busy}
            className="min-h-11 flex flex-col items-center gap-1 pt-2 text-[12px] font-medium text-zinc-200 hover:text-white disabled:opacity-50 transition-colors"
          >
            <Icon name="photos" className="w-7 h-7" />
            Your photos
          </button>
          <button
            type="button"
            onClick={() => void readNow()}
            disabled={!running || !!busy}
            className="group flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <span className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
              <span
                className={`w-11 h-11 rounded-full transition-transform group-active:scale-90 ${
                  busy === 'frame' ? 'bg-accent animate-pulse' : 'bg-white'
                }`}
              />
            </span>
            <span className="text-[12px] font-medium text-zinc-200">
              {busy === 'frame' ? 'Reading…' : 'Read now'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={!!busy}
            className="min-h-11 flex flex-col items-center gap-1 pt-2 text-[12px] font-medium text-zinc-200 hover:text-white disabled:opacity-50 transition-colors"
          >
            <Icon name="camera" className="w-7 h-7" />
            Phone camera
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 text-[12px] text-zinc-400">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-2 underline underline-offset-4 hover:text-white transition-colors"
          >
            Type it instead
          </button>
          <span className="hidden pointer-fine:inline">or paste or drop a photo here</span>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={takeFile}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={takeFile}
        />
      </div>

      {dragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 border-2 border-dashed border-accent pointer-events-none">
          <p className="text-base font-semibold text-white">Drop the photo to read its VIN</p>
        </div>
      )}

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
              checks && found.changed.length === 0 && !found.trimmed
                ? 'text-accent'
                : 'text-amber-200'
            }`}
          >
            {!checks
              ? 'Its check digit does not match. Some VINs from outside North America carry none; compare it with the car.'
              : found.changed.length > 0
                ? `${found.changed.length === 1 ? 'One character was' : 'Some characters were'} unclear and set so the check digit matches (marked). Compare it with the car.`
                : found.trimmed
                  ? 'A mark beside it was read as a character and left out; its check digit matches. Compare it with the car.'
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
