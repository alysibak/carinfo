import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiErrorMessage, decodeVin, type VinDecodeResult } from '../services/api';
import { searchQueryToParams } from '../utils/searchParams';
import { usePageMeta } from '../utils/pageMeta';
import VinCatalogMatch from '../components/VinCatalogMatch';

const VinScanner = lazy(() => import('../components/VinScanner'));

const SAMPLE_VIN = '1HGCM82633A004352'; // 2003 Honda Accord EX-V6

function Subheading({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-400 pt-5 pb-2 border-b border-zinc-900">{children}</p>;
}

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-900 last:border-b-0 gap-4">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-sm font-bold text-white text-right">{value}</span>
    </div>
  );
}

export default function VinDecoder() {
  usePageMeta(
    'VIN lookup',
    'See what a car was built as from its 17-character VIN: year, model, engine, drive and plant, from NHTSA’s decoder, then its recalls, complaints and crash rating.',
  );
  const [searchParams] = useSearchParams();
  const [vin, setVin] = useState('');
  const [result, setResult] = useState<VinDecodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const run = async (raw: string) => {
    const v = raw.trim().toUpperCase();
    if (!v) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await decodeVin(v);
      setResult(data);
    } catch (e: unknown) {
      setError(
        apiErrorMessage(e) ??
          'VIN not found in NHTSA records. Check the 17-character code and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = searchParams.get('vin')?.trim().toUpperCase();
    if (fromUrl && fromUrl.length >= 11) {
      setVin(fromUrl.slice(0, 17));
      run(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when ?vin= is present
  }, []);

  const eng = result?.engine;
  const fuelLabel =
    eng?.electrification && /bev|phev|hev/i.test(eng.electrification)
      ? `${eng.fuelPrimary ?? ''} · ${eng.electrification}`.replace(/^ · /, '')
      : eng?.fuelPrimary;
  const displ = eng?.displacementL ? `${eng.displacementL.toFixed(1)}L` : undefined;
  const engineSummary = [
    displ,
    eng?.cylinders ? `${eng.cylinders}-cyl` : undefined,
    eng?.configuration,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="bg-black text-white">
      <div className="page-wrap section-y">
        <p className="text-xs text-zinc-400 mb-3">Tools</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-3">VIN lookup</h1>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl mb-2">
          Enter the car’s 17-character VIN to see what it was built as: its year, model, engine,
          drive and the plant it came from, from NHTSA’s decoder. Then open its page here for the
          model year’s recalls, owners’ complaints and crash rating, and check the ad against it.
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl mb-6">
          NHTSA’s decoder covers cars sold in the U.S., and most sold in Canada. A field it leaves
          out is not on file, not missing from the car.
        </p>

        {/* The input drops its own outline, so the frame shows where focus is. */}
        <div className="flex flex-col sm:flex-row border border-zinc-700 focus-within:border-zinc-300 transition-colors rounded-none max-w-2xl min-w-0">
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase().slice(0, 17))}
            onKeyDown={(e) => e.key === 'Enter' && run(vin)}
            aria-label="Vehicle identification number (VIN)"
            placeholder="e.g. 1HGCM82633A004352"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full sm:w-auto sm:flex-1 min-w-0 h-12 sm:h-14 bg-zinc-950 border-0 px-3 sm:px-4 text-base font-mono tracking-normal text-white placeholder:text-zinc-500 focus:outline-hidden rounded-none"
          />
          <div className="flex border-t sm:border-t-0 sm:border-l border-zinc-700 shrink-0">
            <button
              type="button"
              onClick={() => setScanning(true)}
              aria-label="Scan VIN barcode with camera"
              title="Scan VIN barcode with camera"
              className="h-12 sm:h-14 px-4 bg-zinc-950 text-zinc-300 hover:text-white rounded-none transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
            </button>
            <button
              onClick={() => run(vin)}
              disabled={loading || vin.trim().length < 11}
              className="flex-1 sm:flex-none h-12 sm:h-14 px-5 sm:px-8 bg-accent text-accent-ink text-[15px] font-semibold hover:bg-accent-hover disabled:opacity-40 border-l border-zinc-700 rounded-none transition-colors"
            >
              {loading ? '…' : 'Decode'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => {
              setVin(SAMPLE_VIN);
              run(SAMPLE_VIN);
            }}
            className="chip"
          >
            Sample VIN
          </button>
          <span>
            The VIN is on the dashboard, read through the windshield, on the label in the driver’s
            door frame, and on the ownership papers. Or tap the camera to scan its barcode.
          </span>
        </div>

        {scanning && (
          <Suspense fallback={null}>
            <VinScanner
              onDetected={(scanned) => {
                setScanning(false);
                setVin(scanned);
                run(scanned);
              }}
              onClose={() => setScanning(false)}
            />
          </Suspense>
        )}

        {error && (
          <div className="mt-8 max-w-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-10 max-w-2xl">
            {result.make ? (
              <>
                <div className="border-b border-zinc-900 pb-5 mb-1">
                  <p className="text-xs text-zinc-400 mb-1">Decoded vehicle</p>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {result.year} {result.make} {result.model}
                  </h2>
                  {(result.trim || result.series || result.bodyClass) && (
                    <p className="text-sm text-zinc-400 mt-1">
                      {[result.trim || result.series, result.bodyClass].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="font-mono text-xs text-zinc-400 mt-2">{result.vin}</p>
                </div>

                {!result.decodedClean && (
                  <p className="text-xs text-amber-300/80 leading-relaxed py-3">
                    NHTSA flagged a checksum issue on this VIN ({result.errorText}). The decode
                    below may be partial. Double-check the VIN for typos.
                  </p>
                )}

                {result.decodedClean && <VinCatalogMatch decoded={result} />}

                <Subheading>As built, by NHTSA’s decoder</Subheading>
                <Row label="Engine" value={engineSummary || undefined} />
                <Row
                  label="Power"
                  value={
                    eng?.hp != null
                      ? `${eng.hp} hp${eng.kw != null ? ` (${eng.kw} kW)` : ''}${eng.hpFromKw ? ', from NHTSA’s kW figure' : ''}`
                      : undefined
                  }
                />
                <Row
                  label="Turbo"
                  value={eng?.turbo == null ? undefined : eng.turbo ? 'Yes' : 'No'}
                />
                <Row label="Fuel" value={fuelLabel} />
                <Row label="Engine model" value={eng?.model} />
                <Row label="Drive type" value={result.driveType} />
                <Row
                  label="Transmission"
                  value={
                    [
                      result.transmission,
                      result.transmissionSpeeds ? `${result.transmissionSpeeds}-spd` : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                />

                <Row label="Body class" value={result.bodyClass} />
                <Row label="Vehicle type" value={result.vehicleType} />
                <Row label="Doors" value={result.doors} />
                <Row label="Manufacturer" value={result.manufacturer} />
                <Row
                  label="Assembled in"
                  value={
                    [result.plantCity, result.plantCountry].filter(Boolean).join(', ') || undefined
                  }
                />

                <p className="text-xs text-zinc-400 leading-relaxed pt-5 mt-2 border-t border-zinc-900">
                  Source: NHTSA’s VIN decoder (vPIC), read live. A field is shown only where NHTSA
                  has it on record.
                </p>
              </>
            ) : (
              <div className="border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-300 leading-relaxed">
                NHTSA couldn’t identify a vehicle from that VIN
                {result.errorText ? ` (${result.errorText})` : ''}. Double-check the 17 characters
                and try again.
              </div>
            )}

            {result.make && (
              <div className="mt-6 border border-zinc-800 bg-zinc-950 px-5 py-4 space-y-3">
                <p className="text-sm text-zinc-300">Not the version you expected? See them all.</p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/home?${searchQueryToParams(
                      {
                        query: [result.year, result.make, result.model].filter(Boolean).join(' '),
                        sort: { field: 'relevance', order: 'desc' },
                      },
                      1,
                    ).toString()}`}
                    className="px-4 py-2 bg-accent text-accent-ink text-xs font-semibold hover:bg-accent-hover"
                  >
                    Search the {result.year} {result.model}
                  </Link>
                  {result.make && result.model && (
                    <Link
                      to={`/home?${searchQueryToParams(
                        {
                          filters: {
                            make: [result.make],
                            model: [result.model],
                            ...(result.year
                              ? { year: { min: result.year, max: result.year } }
                              : {}),
                          },
                          sort: { field: 'year', order: 'desc' },
                          collapseByModel: true,
                        },
                        1,
                      ).toString()}`}
                      className="px-4 py-2 border border-zinc-600 text-xs font-semibold text-zinc-200 hover:border-zinc-400"
                    >
                      Every year of the {result.make} {result.model}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
