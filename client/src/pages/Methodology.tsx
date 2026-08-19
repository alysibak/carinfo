import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/pageMeta';
import ProvenanceChip from '../components/ProvenanceChip';

export default function Methodology() {
  usePageMeta(
    'Methodology',
    'How CarInfo loads EPA data, corrects PHEV mislabels, enriches specs at runtime, and estimates Ontario/CAD market value with stated confidence.',
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-900">
        <div className="page-wrap py-8 md:py-12 max-w-3xl">
          <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-3">Architecture</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">Methodology</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            CarInfo is a rules-driven reference over public automotive data. Every number is either a
            verified fact with a named source, or a clearly labeled estimate with a stated method and
            confidence. This page describes the system, not individual vehicles.
          </p>
        </div>
      </div>

      <div className="page-wrap py-10 md:py-14 max-w-3xl space-y-14">
        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">Data pipeline</h2>
          <ol className="space-y-4 text-sm text-zinc-400 leading-relaxed list-decimal list-inside marker:text-zinc-400">
            <li>
              <strong className="text-zinc-200 font-medium">Raw master record</strong> (
              <code className="text-zinc-400 text-xs">cars.json</code>): ~28,000 EPA FuelEconomy.gov
              configurations (1995–2026). Deliberately omits horsepower, GHG score, NHTSA ratings,
              dimensions, and runtime-only fuel types (PHEV, hydrogen).
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">Load-time enrichment</strong>: companion JSON
              files merge GHG, barrels/yr, PHEV dual-mode economy, EV kWh/range, EPA test-car horsepower, and
              NHTSA safety when a match exists. No network calls at request time.
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">Normalization</strong>: fuel-type inference,
              body-style correction, shopping-segment taxonomy, and Ontario/CAD market valuation run on every
              served record.
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">API + UI</strong>: dossier, compare, and search
              always read the enriched, normalized record. Provenance travels with each field.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            PHEV / BEV reclassification
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            EPA bulk data often tags plug-in hybrids as &quot;electric&quot; when electricity appears in the
            fuel-type string. CarInfo reclassifies at runtime using naming patterns (Volt, Prius Prime, T8,
            4xe, etc.), gas displacement plus short electric-only range (&lt;50 mi), and confirmed BEV name
            patterns (Tesla, Leaf, Bolt EV, etc.).
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            As of the current database, <strong className="text-zinc-200 font-medium">419</strong> records
            stored as electric are corrected to plug-in hybrid. EV economy fields wrongly stored as combined MPG
            (kWh/100mi) are replaced with authoritative MPGe from EPA enrichment. This is pinned by automated
            tests.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            Ontario / CAD valuation model
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Market value, running cost, resale, and TCO are <strong className="text-zinc-200 font-medium">always
            estimated</strong> in Canadian dollars with an Ontario baseline (~15,000 km/yr). They are not live
            listing prices and never presented as MSRP facts.
          </p>
          <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed list-disc list-inside marker:text-zinc-400">
            <li>USD EPA anchors converted via a fixed CAD exchange rate in regional assumptions.</li>
            <li>Depreciation tiers by segment, age, fuel type, and retention class (A/B/C for EVs).</li>
            <li>Insurance, maintenance, tires, and registration scaled by body style and fuel type.</li>
            <li>Energy costs from Ontario gas, diesel, and electricity baselines (hydrogen not modeled).</li>
            <li>Output: low / mid / high band plus a confidence label (low, medium, high).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">Confidence scoring</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Confidence reflects how much the model trusts its own estimate given data completeness and segment
            fit, not dealer quote accuracy.
          </p>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <ProvenanceChip source="epa" /> EPA-verified fuel economy, engine, emissions
            </li>
            <li className="flex items-center gap-2">
              <ProvenanceChip source="nhtsa" /> NHTSA crash-test stars when enriched (~13% per-car coverage)
            </li>
            <li className="flex items-center gap-2">
              <ProvenanceChip source="curated" /> EPA test-car rated horsepower (~71% coverage)
            </li>
            <li className="flex items-center gap-2">
              <ProvenanceChip source="estimated" /> Market value, TCO, predicted 0–60, EV HP when no test-car match
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            Visual identity: specs first, no glamour photos
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            CarInfo deliberately does not use listing photography. Vehicle cards and dossiers show body-type
            illustrations only. That keeps the product honest about what it is: a spec and economics reference,
            not a classifieds site. We would rather omit a field than invent one.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">What we omit</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Dimensions, torque, real 0–60 times, and listing photos are not in the EPA bulk source. Missing
            fields are left empty on the dossier (no row, no chip) and dropped from compare when empty across
            all vehicles. Compare cells use &quot;Not on file&quot; only when some cars have data and others do
            not.
          </p>
        </section>

        <div className="pt-6 border-t border-zinc-900">
          <Link
            to="/home"
            className="inline-block px-6 py-3 bg-white text-black text-xs font-black tracking-[0.25em] uppercase hover:bg-zinc-200 transition-colors"
          >
            Search vehicles
          </Link>
        </div>
      </div>
    </div>
  );
}
