import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeVin, type VinDecodeResult } from '../services/api';
import TrustLabel, { InfoTip } from '../components/ui';

const SAMPLE_VIN = '1HGCM82633A004352'; // 2003 Honda Accord EX-V6 — decodes with 240 hp

/** Plain-language read on a real HP figure (interpretation only — no invented numbers). */
function hpPlain(hp: number): string {
  if (hp < 120) return 'Modest power, tuned for efficiency and easy city driving.';
  if (hp < 180) return 'Everyday power, fine for commuting and highway merging.';
  if (hp < 260) return 'Healthy power, confident passing, quick enough for most drivers.';
  if (hp < 400) return 'Strong power, noticeably quick acceleration.';
  return 'High performance, seriously fast.';
}

function Subheading({ children, source }: { children: React.ReactNode; source?: 'nhtsa' }) {
  return (
    <p className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase pt-5 pb-2 border-b border-zinc-900 flex items-center gap-2">
      {children}
      {source && <TrustLabel source={source} />}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-900 last:border-b-0 gap-4">
      <span className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase">{label}</span>
      <span className="text-sm font-bold text-white text-right">{value}</span>
    </div>
  );
}

export default function VinDecoder() {
  const [searchParams] = useSearchParams();
  const [vin, setVin] = useState('');
  const [result, setResult] = useState<VinDecodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (raw: string) => {
    const v = raw.trim().toUpperCase();
    if (!v) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await decodeVin(v);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'VIN not found in NHTSA records. Check the 17-character code and try again.');
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
  const fuelLabel = eng?.electrification && /bev|phev|hev/i.test(eng.electrification)
    ? `${eng.fuelPrimary ?? ''} · ${eng.electrification}`.replace(/^ · /, '')
    : eng?.fuelPrimary;
  const displ = eng?.displacementL ? `${eng.displacementL.toFixed(1)}L` : undefined;
  const engineSummary = [displ, eng?.cylinders ? `${eng.cylinders}-cyl` : undefined, eng?.configuration]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="page-wrap py-10 md:py-14">
        <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-3">Tools</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-3">VIN Lookup</h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mb-2">
          Paste a vehicle’s 17-character VIN to pull its official specs straight from{' '}
          <span className="text-zinc-200">NHTSA’s free U.S. government database</span>, including{' '}
          <span className="text-zinc-200">horsepower</span> when NHTSA has it on record. Unlike the catalog
          (which uses EPA fuel-economy data, with no engine power), a VIN can unlock real per-vehicle power figures.
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl mb-6">
          Heads up: NHTSA doesn’t list horsepower for every vehicle. Many EVs and some models simply don’t carry it
          in the VIN record. We show it honestly when it’s there.
        </p>

        <div className="flex border border-zinc-700 rounded-none max-w-2xl">
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase().slice(0, 17))}
            onKeyDown={(e) => e.key === 'Enter' && run(vin)}
            placeholder="e.g. 1HGCM82633A004352"
            spellCheck={false}
            className="flex-1 h-14 bg-zinc-950 border-0 px-4 text-base font-mono tracking-widest text-white placeholder:text-zinc-400 focus:outline-none uppercase rounded-none"
          />
          <button
            onClick={() => run(vin)}
            disabled={loading || vin.trim().length < 11}
            className="h-14 px-8 bg-white text-black text-xs font-semibold uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-40 border-l border-zinc-700 rounded-none transition-colors"
          >
            {loading ? '…' : 'Decode'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-zinc-400">
          <button
            type="button"
            onClick={() => { setVin(SAMPLE_VIN); run(SAMPLE_VIN); }}
            className="chip"
          >
            Sample VIN
          </button>
          <span>Find your VIN on the dashboard by the windshield, the driver’s door jamb, or your registration.</span>
        </div>

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
                  <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-1">Decoded vehicle</p>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                    {result.year} {result.make} {result.model}
                  </h2>
                  {(result.trim || result.series || result.bodyClass) && (
                    <p className="text-sm text-zinc-400 mt-1">
                      {[result.trim || result.series, result.bodyClass].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="font-mono text-[11px] tracking-widest text-zinc-400 mt-2">{result.vin}</p>
                </div>

                {!result.decodedClean && (
                  <p className="text-[11px] text-amber-300/80 leading-relaxed py-3">
                    NHTSA flagged a checksum issue on this VIN ({result.errorText}). The decode below may be partial.
                    Double-check the VIN for typos.
                  </p>
                )}

                {/* Horsepower — the headline figure, with dual framing */}
                <Subheading source="nhtsa">
                  <InfoTip label="Horsepower">
                    A measure of engine power. More horsepower generally means quicker acceleration. NHTSA publishes
                    this for many vehicles based on the VIN.
                  </InfoTip>
                </Subheading>
                {eng?.hp != null ? (
                  <div className="py-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black tracking-tighter text-white">{eng.hp}</span>
                      <span className="text-lg font-bold text-zinc-400">hp</span>
                      {eng.kw != null && <span className="text-xs text-zinc-400">({eng.kw} kW)</span>}
                    </div>
                    <p className="text-[12px] text-zinc-400 leading-relaxed mt-2">{hpPlain(eng.hp)}</p>
                    {eng.hpFromKw && (
                      <p className="text-[10px] text-zinc-400 mt-1">Converted from NHTSA’s kilowatt figure.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 leading-relaxed py-4">
                    NHTSA doesn’t list horsepower for this VIN. That’s common. Many vehicles (especially EVs) don’t
                    carry an engine-power value in the VIN record. It usually means “not on file,” not zero power.
                  </p>
                )}

                <Subheading source="nhtsa">Engine &amp; drivetrain</Subheading>
                <Row label="Engine" value={engineSummary || undefined} />
                <Row label="Turbo" value={eng?.turbo == null ? undefined : eng.turbo ? 'Yes' : 'No'} />
                <Row label="Fuel" value={fuelLabel} />
                <Row label="Engine model" value={eng?.model} />
                <Row label="Drive type" value={result.driveType} />
                <Row
                  label="Transmission"
                  value={[result.transmission, result.transmissionSpeeds ? `${result.transmissionSpeeds}-spd` : '']
                    .filter(Boolean)
                    .join(' ') || undefined}
                />

                <Subheading source="nhtsa">Body &amp; build</Subheading>
                <Row label="Body class" value={result.bodyClass} />
                <Row label="Vehicle type" value={result.vehicleType} />
                <Row label="Doors" value={result.doors} />
                <Row label="Manufacturer" value={result.manufacturer} />
                <Row
                  label="Assembled in"
                  value={[result.plantCity, result.plantCountry].filter(Boolean).join(', ') || undefined}
                />

                <p className="text-[10px] text-zinc-400 leading-relaxed pt-5 mt-2 border-t border-zinc-900">
                  Source: NHTSA vPIC (vpic.nhtsa.dot.gov), decoded live from the VIN. Horsepower and other fields are
                  shown only where NHTSA has them on record.
                </p>
              </>
            ) : (
              <div className="border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-zinc-300 leading-relaxed">
                NHTSA couldn’t identify a vehicle from that VIN{result.errorText ? ` (${result.errorText})` : ''}.
                Double-check the 17 characters and try again.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
