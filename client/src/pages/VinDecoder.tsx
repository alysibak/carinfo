import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiErrorMessage, decodeVin, type VinDecodeResult } from '../services/api';
import { searchQueryToParams } from '../utils/searchParams';
import { usePageMeta } from '../utils/pageMeta';
import VinCatalogMatch from '../components/VinCatalogMatch';
import { cleanVinInput, vinCheckDigitValid } from '../utils/vin';

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

/**
 * How far along the VIN typed is, under the field: how many of its 17, then
 * whether its check digit (the 9th character) matches the rest, so a slip of
 * a key shows before it is looked up.
 */
function VinProgress({ vin, swapped }: { vin: string; swapped: boolean }) {
  const whole = vin.length === 17;
  const checks = whole && vinCheckDigitValid(vin);
  return (
    <div
      id="vin-progress"
      className="mt-2 max-w-2xl min-h-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"
    >
      {vin.length > 0 && (
        <p
          className={`font-semibold tabular-nums ${
            !whole ? 'text-zinc-400' : checks ? 'text-accent' : 'text-amber-200'
          }`}
        >
          {!whole
            ? `${vin.length} of 17`
            : checks
              ? '17 of 17, and its check digit matches'
              : '17 of 17, but its check digit does not match: look for a mistyped character'}
        </p>
      )}
      {whole && !checks && (
        <p className="text-zinc-400">Some VINs from outside North America carry no check digit.</p>
      )}
      {swapped && <p className="text-zinc-400">I, O and Q are never in a VIN: read as 1 and 0.</p>}
    </div>
  );
}

/** What one VIN tells a buyer, in the order the page gives it. */
const VIN_GIVES = [
  {
    title: 'What it was built as',
    body: 'Its year, model, engine, drive and the plant it came from, from NHTSA’s decoder.',
  },
  {
    title: 'Its model year’s record',
    body: 'Recalls in Canada, owners’ complaints and the crash rating, on its page here.',
  },
  {
    title: 'A check on the ad',
    body: 'Whether the year, engine and drive the seller gives match what the VIN says.',
  },
] as const;

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
  const [swapped, setSwapped] = useState(false);

  const enter = (raw: string) => {
    const cleaned = cleanVinInput(raw);
    setVin(cleaned.vin);
    // Said until the field is cleared: a 0 that appeared unasked needs saying once.
    setSwapped((was) => cleaned.vin !== '' && (was || cleaned.swapped));
  };

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
    const fromUrl = cleanVinInput(searchParams.get('vin') ?? '').vin;
    if (fromUrl.length >= 11) {
      setVin(fromUrl);
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
        <h1 className="page-title mb-3">VIN lookup</h1>
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
          {/* Large and spaced: a VIN is checked a character at a time against the car. */}
          <input
            value={vin}
            onChange={(e) => enter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run(vin)}
            aria-label="Vehicle identification number (VIN)"
            aria-describedby="vin-progress"
            placeholder="17 characters"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full sm:w-auto sm:flex-1 min-w-0 h-14 bg-zinc-950 border-0 px-3 sm:px-4 text-lg sm:text-xl font-mono tracking-[0.12em] text-white placeholder:text-zinc-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-base focus:outline-hidden rounded-none"
          />
          <div className="flex border-t sm:border-t-0 sm:border-l border-zinc-700 shrink-0">
            <button
              type="button"
              onClick={() => setScanning(true)}
              aria-label="Scan the VIN with the camera"
              className="h-12 sm:h-14 px-4 flex items-center gap-2 bg-zinc-950 text-[15px] font-semibold text-zinc-200 hover:text-white hover:bg-zinc-900 rounded-none transition-colors"
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
              Scan
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

        <VinProgress vin={vin} swapped={swapped} />

        {/* As wide as the field above it: a line the width of the page was hard to read. */}
        <div className="flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-2 mt-3 text-xs text-zinc-400 max-w-2xl">
          <button
            type="button"
            onClick={() => {
              enter(SAMPLE_VIN);
              run(SAMPLE_VIN);
            }}
            className="chip shrink-0"
          >
            Sample VIN
          </button>
          <span className="min-w-0 leading-relaxed sm:pt-1">
            The VIN is on the dashboard, read through the windshield, on the label in the driver’s
            door frame, and on the ownership papers. Or scan it: the camera reads the barcode or the
            printed VIN.
          </span>
        </div>

        {scanning && (
          <Suspense fallback={null}>
            <VinScanner
              onDetected={(scanned) => {
                setScanning(false);
                enter(scanned);
                run(scanned);
              }}
              onClose={() => setScanning(false)}
            />
          </Suspense>
        )}

        {!result && !error && !loading && (
          // What a VIN gives, before one is entered: the page was a lone field.
          <ol className="mt-12 max-w-2xl grid gap-px bg-zinc-900 border border-zinc-900 sm:grid-cols-3">
            {VIN_GIVES.map((item, index) => (
              <li key={item.title} className="bg-black p-4">
                <p className="text-xs text-zinc-500 tabular-nums">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ol>
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
                  <p className="text-xs text-zinc-400 mb-1">From the VIN</p>
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
