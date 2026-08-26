import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { extractVinFromScan } from '../utils/vin';

interface VinScannerProps {
  onDetected: (vin: string) => void;
  onClose: () => void;
}

/** Formats VINs actually ship in: Code 39 on door stickers, Code 128 on
 * some windshield labels, Data Matrix / QR on newer plates, PDF417 on
 * registration documents. */
const NATIVE_FORMATS = ['code_39', 'code_128', 'data_matrix', 'qr_code', 'pdf417'];

const ZXING_FORMATS = [
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_128,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.PDF_417,
];

interface NativeDetection {
  rawValue: string;
}

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<NativeDetection[]>;
}

type NativeDetectorConstructor = {
  new (options?: { formats?: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
};

function getNativeDetectorCtor(): NativeDetectorConstructor | undefined {
  return (globalThis as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector;
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was blocked. Allow camera access for this site in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No usable camera was found on this device.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is busy in another app. Close it and try again.';
  }
  return 'The camera could not be started. You can still type the VIN below.';
}

export default function VinScanner({ onDetected, onClose }: VinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Latest callbacks without re-running the camera effect.
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!window.isSecureContext) {
      setError('Camera scanning needs a secure (HTTPS) connection.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera access. You can still type the VIN below.');
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let intervalId: number | undefined;
    let zxingControls: IScannerControls | null = null;
    let found = false;

    const handleText = (text: string) => {
      if (cancelled || found) return;
      const vin = extractVinFromScan(text);
      if (vin) {
        found = true;
        onDetectedRef.current(vin);
      }
    };

    const startNative = async (): Promise<boolean> => {
      const Ctor = getNativeDetectorCtor();
      if (!Ctor) return false;
      try {
        const supported = await Ctor.getSupportedFormats();
        const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
        // Without Code 39 the native detector would miss most door
        // stickers, so fall back to zxing instead.
        if (!formats.includes('code_39')) return false;

        const detector = new Ctor({ formats });
        let busy = false;
        intervalId = window.setInterval(async () => {
          if (busy || cancelled || video.readyState < 2) return;
          busy = true;
          try {
            const results = await detector.detect(video);
            for (const r of results) handleText(r.rawValue);
          } catch {
            // A frame failed to decode — keep scanning.
          } finally {
            busy = false;
          }
        }, 250);
        return true;
      } catch {
        return false;
      }
    };

    const startZxing = async () => {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      zxingControls = await reader.decodeFromVideoElement(video, (result) => {
        if (result) handleText(result.getText());
      });
    };

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
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setReady(true);

        if (!(await startNative()) && !cancelled) {
          await startZxing();
        }
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan VIN barcode"
      className="fixed inset-0 z-[300] bg-black flex flex-col"
    >
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Scan guide */}
        {ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[82%] max-w-md aspect-[3/1] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Starting camera…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <p className="max-w-sm text-sm text-zinc-300 leading-relaxed text-center">{error}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-black border-t border-zinc-800 px-5 py-4 flex items-center justify-between gap-4">
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Point at the VIN barcode — driver&rsquo;s door sticker or the plate at the base of the windshield.
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="shrink-0 px-5 py-2.5 border border-zinc-600 text-xs font-semibold uppercase tracking-widest text-white hover:border-zinc-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
