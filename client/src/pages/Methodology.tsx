import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/pageMeta';
import ProvenanceChip from '../components/ProvenanceChip';
import { FIRST_MODEL_YEAR, LATEST_MODEL_YEAR } from '@carinfo/config/model-years';

export default function Methodology() {
  usePageMeta(
    'Methodology',
    'How CarInfo loads EPA data, corrects PHEV mislabels, enriches specs at runtime, and estimates Ontario/CAD market value with stated confidence.',
  );

  return (
    <div className="bg-black text-white">
      <div className="border-b border-zinc-900">
        <div className="page-wrap section-y max-w-3xl">
          <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-3">Architecture</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
            Methodology
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            CarInfo is a rules-driven reference over public automotive data. Every number is either
            a verified fact with a named source, or a clearly labeled estimate with a stated method
            and confidence. This page describes the system, not individual vehicles.
          </p>
        </div>
      </div>

      <div className="page-wrap section-y max-w-3xl space-y-10 md:space-y-12">
        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            Data pipeline
          </h2>
          <ol className="space-y-4 text-sm text-zinc-400 leading-relaxed list-decimal list-inside marker:text-zinc-400">
            <li>
              <strong className="text-zinc-200 font-medium">Raw master record</strong> (
              <code className="text-zinc-400 text-xs">cars.json</code>): ~35,800 EPA FuelEconomy.gov
              configurations ({FIRST_MODEL_YEAR}–{LATEST_MODEL_YEAR}). Deliberately omits
              horsepower, GHG score, NHTSA ratings, dimensions, and runtime-only fuel types (PHEV,
              hydrogen).
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">Load-time enrichment</strong>: companion
              JSON files merge GHG, barrels/yr, PHEV dual-mode economy, EV kWh/range, EPA test-car
              horsepower, and NHTSA safety when a match exists. No network calls at request time.
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">Normalization</strong>: fuel-type
              inference, body-style correction, shopping-segment taxonomy, and Ontario/CAD market
              valuation run on every served record.
            </li>
            <li>
              <strong className="text-zinc-200 font-medium">API + UI</strong>: dossier, compare, and
              search always read the enriched, normalized record. Provenance travels with each
              field.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            PHEV / BEV reclassification
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            EPA bulk data often tags plug-in hybrids as &quot;electric&quot; when electricity
            appears in the fuel-type string. CarInfo reclassifies at runtime using naming patterns
            (Volt, Prius Prime, T8, 4xe, etc.), gas displacement plus short electric-only range
            (&lt;50 mi), and confirmed BEV name patterns (Tesla, Leaf, Bolt EV, etc.).
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            As of the current database, <strong className="text-zinc-200 font-medium">419</strong>{' '}
            records stored as electric are corrected to plug-in hybrid. EV economy fields wrongly
            stored as combined MPG (kWh/100mi) are replaced with authoritative MPGe from EPA
            enrichment. This is pinned by automated tests.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            Canadian (CAD) valuation model
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Market value, running cost, resale, and TCO are{' '}
            <strong className="text-zinc-200 font-medium">always estimated</strong> in Canadian
            dollars for the region you pick: Ontario (~15,000 km/yr) or British Columbia (~14,000
            km/yr). They are not live listing prices and never presented as MSRP facts.
          </p>
          <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed list-disc list-inside marker:text-zinc-400">
            <li>
              Value starts from a typical current US sticker price for the vehicle&rsquo;s model,
              maker or size class, converted at the ratio of Canadian to US sticker prices (about
              1.2, not the exchange rate), then depreciated by age.
            </li>
            <li>
              Checked against average Canadian asking prices for 58 reference vehicles, from
              compacts to pickups, performance cars, plug-in hybrids and EVs; expect individual
              estimates to be within about 25%.
            </li>
            <li>
              For everyday cars, SUVs and minivans the make matters from about three years on: a
              seven-year-old Honda or Toyota keeps far more of its price than a Ford, Chevrolet or
              Nissan of the same size.
            </li>
            <li>
              Pickups depreciate on their own curve, mid-size pickups more gently than full-size,
              and models known to hold value (Tacoma, 4Runner, RAV4 Prime) more gently still.
            </li>
            <li>
              Performance versions EPA lists under the base model&rsquo;s name (a Mustang GT, a
              Camaro ZL1, a Civic Type R) are priced by their engine, and cars known to hold value
              unusually well are depreciated more gently.
            </li>
            <li>
              Collector cars are not valued: a first-generation NSX, a Supra Turbo, an air-cooled
              911, a Viper or a supercar trades on auction results and condition, and is often worth
              more than when new.
            </li>
            <li>
              Depreciation curves by segment, age and fuel type. Electric cars follow one curve
              fitted to Canadian listings (about half the sticker at five years), with a steeper
              discount for early short-range models; battery health widens the range rather than
              lowering the average, since listing prices already reflect typical wear.
            </li>
            <li>
              Insurance starts from each province&rsquo;s average premium (FSRA in Ontario, ICBC in
              B.C.), then scales with body style, luxury make, value and age. Your own quote depends
              on your record and postal code far more than on the car.
            </li>
            <li>
              Maintenance and tires follow AAA and CAA driving-cost studies, by fuel type and age.
              Ontario charges no plate renewal fee (since 2022).
            </li>
            <li>
              Energy costs from your region&rsquo;s gas, diesel and home-electricity prices (recent
              Statistics Canada averages). Hydrogen uses B.C.&rsquo;s posted pump price (about
              $16.50/kg); Ontario posts none, so a fuel-cell car&rsquo;s fuel is left out there
              rather than shown as free. Natural gas uses EPA&rsquo;s own annual fuel-cost figure,
              converted to CAD.
            </li>
            <li>Output: low / mid / high band plus a confidence label (low, medium, high).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            Confidence scoring
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Confidence reflects how much the model trusts its own estimate given data completeness
            and segment fit, not dealer quote accuracy.
          </p>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <ProvenanceChip source="epa" /> EPA-verified fuel economy, engine, emissions
            </li>
            <li className="flex items-center gap-2">
              <ProvenanceChip source="nhtsa" /> NHTSA crash-test stars when enriched (~13% per-car
              coverage)
            </li>
            <li className="flex items-center gap-2">
              <ProvenanceChip source="curated" /> EPA test-car rated horsepower (~71% coverage)
            </li>
            <li className="flex items-center gap-2">
              <ProvenanceChip source="estimated" /> Market value, TCO, predicted 0-60, EV HP when no
              test-car match
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            Visual identity: specs first, no glamour photos
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            CarInfo deliberately does not use listing photography. Vehicle cards and dossiers show
            body-type illustrations only. That keeps the product honest about what it is: a spec and
            economics reference, not a classifieds site. We would rather omit a field than invent
            one.
          </p>
        </section>

        <section>
          <h2 className="text-xs font-black tracking-[0.25em] uppercase text-white mb-4">
            What we omit
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Dimensions, torque, real 0-60 times, and listing photos are not in the EPA bulk source.
            Missing fields are left empty on the dossier (no row, no chip) and dropped from compare
            when empty across all vehicles. Compare cells use &quot;Not on file&quot; only when some
            cars have data and others do not.
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
