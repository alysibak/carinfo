import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { displayListingSubtitle } from '../utils/trimLabel';
import {
  formatCurrency,
  formatCurrencyRange,
  hasNumericValue,
  NHTSA_CHIP_UNAVAILABLE,
  SAFETY_UNAVAILABLE_NOTE,
} from '../utils/dataValue';
import { CURRENCY_SECTION_NOTE } from '../utils/currency';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';
import TCOCalculator from '../components/TCOCalculator';
import { ExpandableSection, InfoTip } from '../components/ui';
import ValuationLinks from '../components/ValuationLinks';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import GlanceRow from '../components/GlanceRow';
import KeySpecs from '../components/KeySpecs';
import SimilarCars from '../components/SimilarCars';
import { DataRow } from '../components/DataValue';
import { efficiencyUnit } from '../utils/fuelLabels';
import { formatFuelBadge, formatPowertrainLabel } from '../utils/fuelDisplay';
import { efficiencySecondaryLine, formatKwhPer100KmFromMi } from '../utils/fuelEconomyUnits';
import { ghgFraming, phevModes, tailpipeEmissionsNote, type PhevModes } from '../utils/epaContent';

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase pt-4 pb-2 border-b border-zinc-900">
      {children}
    </p>
  );
}

function FuelBar({
  label,
  value,
  max,
  secondary,
}: {
  label: string;
  value: number | undefined;
  max: number;
  secondary?: string;
}) {
  if (!hasNumericValue(value)) return null;
  const pct = Math.min(100, (value! / max) * 100);
  return (
    <div className="py-3 border-b border-zinc-900 last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase">{label}</span>
        <div className="text-right">
          <span className="text-sm font-bold text-white">{Math.round(value!)}</span>
          {secondary && <p className="text-[10px] text-zinc-500 mt-0.5">{secondary}</p>}
        </div>
      </div>
      <div className="w-full bg-zinc-900 h-1">
        <div className="bg-white h-1 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SafetyRow({ label, score }: { label: string; score: number | undefined }) {
  if (!hasNumericValue(score, { allowZero: false })) return null;
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-900 last:border-b-0">
      <span className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`w-2 h-2 ${star <= score! ? 'bg-white' : 'bg-zinc-800'}`} />
        ))}
        <span className="ml-2 text-sm font-bold text-white">{score}/5</span>
      </div>
    </div>
  );
}

/** Row pairing a technical figure with a plain-language line (+ optional "?" tooltip). */
function InsightRow({
  label,
  value,
  plain,
  tip,
}: {
  label: string;
  value: string;
  plain?: string;
  tip?: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-zinc-900 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase">
          {tip ? <InfoTip label={label}>{tip}</InfoTip> : label}
        </span>
        <span className="text-sm font-bold text-white text-right">{value}</span>
      </div>
      {plain && <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">{plain}</p>}
    </div>
  );
}

/** Plug-in hybrids run in two modes — show both rather than a confusing blended figure. */
function PhevDualModeBlock({ modes }: { modes: PhevModes }) {
  return (
    <div className="py-3 space-y-4">
      {hasNumericValue(modes.electricMpge) && (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[10px] tracking-[0.25em] text-zinc-300 uppercase">Electric mode</span>
            <span className="text-sm font-bold text-white">
              {modes.electricMpge} MPGe
              {hasNumericValue(modes.electricRangeMi) ? ` · ${modes.electricRangeMi} mi` : ''}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
            Drives on battery power
            {hasNumericValue(modes.electricRangeMi) ? ` for about ${modes.electricRangeMi} miles` : ''} after a full
            charge — like an EV — then switches to gas automatically.
          </p>
        </div>
      )}
      {hasNumericValue(modes.gasMpg) && (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[10px] tracking-[0.25em] text-zinc-300 uppercase">Gas mode</span>
            <span className="text-sm font-bold text-white">{modes.gasMpg} MPG</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
            Once the battery is used up it runs like a regular hybrid on gasoline — no plugging in required.
          </p>
        </div>
      )}
      {hasNumericValue(modes.chargeL2Hours) && (
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Recharges in about {modes.chargeL2Hours} h on a 240V Level 2 charger.
        </p>
      )}
    </div>
  );
}

function hasFuelEconomyData(car: CarSpecs): boolean {
  return (
    hasNumericValue(car.fuelEconomy.city) ||
    hasNumericValue(car.fuelEconomy.highway) ||
    hasNumericValue(car.fuelEconomy.combined)
  );
}

export default function CarDetail() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<CarDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTCO, setShowTCO] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { addCarToComparison, comparedCars } = useCarStore();
  const addToGarage = useGarageStore((s) => s.add);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setDashboard(null);
    setError(null);
    setLoading(true);
    api
      .getCarDashboard(id)
      .then(setDashboard)
      .catch(() => setError('Unable to load vehicle dashboard.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-zinc-800 border-t-white animate-spin mb-4" />
          <p className="text-xs tracking-[0.3em] text-zinc-300 uppercase">Loading dossier</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-center px-4">
        <div>
          <p className="text-2xl font-black tracking-tighter text-white mb-4 uppercase">Not found</p>
          {error && <p className="text-xs tracking-widest text-zinc-400 mb-6 uppercase">{error}</p>}
          <Link
            to="/home"
            className="inline-block px-8 py-3 bg-white text-black text-xs font-black tracking-[0.3em] uppercase hover:bg-zinc-200 transition-colors"
          >
            Search archive
          </Link>
        </div>
      </div>
    );
  }

  const { car, ownership, evCharge } = dashboard;
  const { marketValue, annualCost, resaleImpact, derivedComparison, assumptions, warnings, practicalityNote } =
    ownership;
  const isEv = car.engine.fuelType === 'electric';
  const isHydrogen = car.engine.fuelType === 'hydrogen';
  const efficiencyLabel = efficiencyUnit(car);
  const fuelMax = Math.max(
    car.fuelEconomy.city ?? 0,
    car.fuelEconomy.highway ?? 0,
    car.fuelEconomy.combined ?? 0,
    1,
  );
  const isInCompare = comparedCars.some((c) => c.id === car.id);
  const trimLabel = displayListingSubtitle(car);
  const hasSafety = hasNumericValue(car.safetyRating?.overall, { allowZero: false });
  const isPhev = car.engine.fuelType === 'plug-in hybrid';
  const phev = phevModes(car);
  const ghg = ghgFraming(car);
  const hasFuelData = hasFuelEconomyData(car);
  const hasEconomics = annualCost.total != null;
  const safetyScores = hasSafety
    ? [car.safetyRating!.overall, car.safetyRating!.frontal, car.safetyRating!.side, car.safetyRating!.rollover].filter(
        (s) => hasNumericValue(s, { allowZero: false }),
      )
    : [];

  const fuelSummary = hasFuelData
    ? `Combined ${Math.round(car.fuelEconomy.combined ?? 0)} · expand for breakdown`
    : 'EPA fuel economy not on file';

  const valueSummary =
    annualCost.total != null
      ? `${formatCurrencyRange(annualCost.totalLow, annualCost.totalHigh)}/yr · expand for breakdown`
      : 'Ownership estimates limited for this configuration';

  const handleAddToComparison = () => {
    addCarToComparison(car);
    setToast('Added to compare');
  };

  const handleAddToGarage = () => {
    const res = addToGarage(car);
    if (!res.ok && res.reason === 'duplicate') {
      setToast('Already in garage');
      return;
    }
    setToast('Added to garage');
  };

  const scrollToSimilar = () => {
    document.getElementById('similar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white text-black text-xs font-black tracking-[0.25em] uppercase">
          {toast}
        </div>
      )}

      <div className="bg-black border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            BACK
          </button>
          <div className="text-center min-w-0">
            <p className="text-[10px] tracking-[0.3em] text-zinc-300 uppercase">Vehicle dossier</p>
            <p className="text-sm font-black tracking-tight truncate">
              {car.year} {car.make} {car.model}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToGarage}
              className="hidden sm:block px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase border border-zinc-700 hover:border-white hover:text-white text-zinc-400 transition-colors"
            >
              + Garage
            </button>
            <button
              onClick={handleAddToComparison}
              className={`px-4 py-2 text-[10px] font-black tracking-[0.2em] uppercase border transition-colors ${
                isInCompare
                  ? 'border-white text-white bg-zinc-900'
                  : 'bg-white text-black border-white hover:bg-zinc-200'
              }`}
            >
              {isInCompare ? 'In compare ✓' : '+ Compare'}
            </button>
          </div>
        </div>
      </div>

      {isHydrogen && (
        <div className="border-b border-amber-900/50 bg-amber-950/20">
          <div className="page-wrap py-4 text-sm text-amber-200/90 leading-relaxed">
            <strong className="text-amber-100">Hydrogen fuel cell (FCEV).</strong> MPGe is from EPA tests — not
            gasoline MPG. Fuel costs here do not reflect Ontario H₂ availability.
          </div>
        </div>
      )}

      <div className="border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,340px)_1fr] gap-8 md:gap-12 items-start">
            <div className="aspect-[4/3] border border-zinc-900 overflow-hidden">
              <VehiclePlaceholder car={car} />
            </div>
            <div className="min-w-0">
              <p className="text-6xl md:text-7xl font-black text-zinc-800 leading-none mb-3">{car.year}</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-1">{car.make.toUpperCase()}</h1>
              <p className="text-xl md:text-2xl font-light tracking-wider text-zinc-400 mb-4">{car.model}</p>
              {trimLabel && (
                <p className="text-xs tracking-[0.25em] text-zinc-300 uppercase mb-4">{trimLabel}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-6">
                {car.bodyStyle && (
                  <span className="px-3 py-1 border border-zinc-800 text-[10px] tracking-[0.2em] text-zinc-400 uppercase">
                    {car.bodyStyle}
                  </span>
                )}
                {car.driveType && (
                  <span className="px-3 py-1 border border-zinc-800 text-[10px] tracking-[0.2em] text-zinc-400 uppercase">
                    {car.driveType}
                  </span>
                )}
                {car.engine.fuelType && (
                  <span className="px-3 py-1 border border-zinc-800 text-[10px] tracking-[0.2em] text-zinc-400 uppercase">
                    {formatFuelBadge(car.engine.fuelType)}
                  </span>
                )}
                {formatPowertrainLabel(car.engine.fuelType) && (
                  <span className="px-3 py-1 border border-zinc-700 text-[10px] tracking-[0.2em] text-zinc-300 uppercase">
                    {formatPowertrainLabel(car.engine.fuelType)}
                  </span>
                )}
                {hasNumericValue(car.engine.horsepower) && (
                  <span className="px-3 py-1 border border-zinc-700 text-[10px] tracking-[0.2em] text-zinc-200 uppercase">
                    {Math.round(car.engine.horsepower!)} hp
                  </span>
                )}
                {ghg && (
                  <span
                    className="px-3 py-1 border border-zinc-700 text-[10px] tracking-[0.2em] text-zinc-300 uppercase"
                    title={`EPA greenhouse-gas score ${ghg.score}/10 — ${ghg.plain.toLowerCase()}`}
                  >
                    Emissions {ghg.score}/10
                  </span>
                )}
                {hasSafety ? (
                  <span className="px-3 py-1 border border-zinc-700 text-[10px] tracking-[0.2em] text-zinc-300 uppercase">
                    NHTSA {car.safetyRating!.overall}/5
                  </span>
                ) : (
                  <span className="px-3 py-1 border border-dashed border-zinc-800 text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
                    {NHTSA_CHIP_UNAVAILABLE}
                  </span>
                )}
                {car.countryOfOrigin && (
                  <span className="px-3 py-1 border border-zinc-800 text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                    {car.countryOfOrigin}
                  </span>
                )}
              </div>
              {car.ownershipProfile && (
                <div className="mb-6 p-4 border border-zinc-800 bg-zinc-950/60 rounded-lg">
                  <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase mb-2">Ownership profile</p>
                  <p className="text-lg font-semibold text-white mb-3">{car.ownershipProfile.label}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {car.ownershipProfile.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 text-[10px] tracking-wide text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase mb-2">Best for</p>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    {car.ownershipProfile.bestFor.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <ValuationLinks
                compact
                assumptions={assumptions}
                derivedComparison={derivedComparison}
                warnings={warnings}
                practicalityNote={practicalityNote}
              />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAddToComparison}
                  className={`px-6 py-3 text-[10px] font-black tracking-[0.25em] uppercase transition-colors ${
                    isInCompare
                      ? 'border border-white text-white bg-zinc-900'
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {isInCompare ? 'In compare ✓' : 'Add to compare'}
                </button>
                <button
                  onClick={scrollToSimilar}
                  className="px-4 py-3 text-[10px] font-black tracking-[0.25em] uppercase text-zinc-400 hover:text-white transition-colors"
                >
                  See similar ↓
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GlanceRow dashboard={dashboard} />

      <KeySpecs dashboard={dashboard} />

      <div className="sm:hidden border-b border-zinc-900 px-6 py-4 flex gap-2">
        <button
          onClick={handleAddToGarage}
          className="flex-1 py-3 bg-white text-black text-[10px] font-black tracking-[0.2em] uppercase"
        >
          + Garage
        </button>
        <button
          onClick={() => setShowTCO(true)}
          className="flex-1 py-3 border border-zinc-700 text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400"
        >
          TCO calc
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
        <div className="space-y-px">
          <ExpandableSection
            title="Fuel economy & safety"
            summary={`EPA test cycle · ${fuelSummary}`}
            defaultOpen
          >
            {hasFuelData ? (
              <>
                {isPhev && phev ? (
                  <>
                    <Subheading>Plug-in hybrid — two ways to drive</Subheading>
                    <PhevDualModeBlock modes={phev} />
                  </>
                ) : (
                  <>
                    <FuelBar
                      label={`City (${efficiencyLabel})`}
                      value={car.fuelEconomy.city}
                      max={fuelMax}
                      secondary={efficiencySecondaryLine(car.fuelEconomy.city, efficiencyLabel)}
                    />
                    <FuelBar
                      label={`Highway (${efficiencyLabel})`}
                      value={car.fuelEconomy.highway}
                      max={fuelMax}
                      secondary={efficiencySecondaryLine(car.fuelEconomy.highway, efficiencyLabel)}
                    />
                    <FuelBar
                      label={`Combined (${efficiencyLabel})`}
                      value={car.fuelEconomy.combined}
                      max={fuelMax}
                      secondary={efficiencySecondaryLine(car.fuelEconomy.combined, efficiencyLabel)}
                    />
                  </>
                )}
                {car.epa?.co2 != null && (
                  <DataRow label="CO₂ emissions" value={`${car.epa.co2} g/mi`} allowZero />
                )}
                {tailpipeEmissionsNote(car) && (
                  <p className="text-xs text-zinc-400 leading-relaxed py-2">{tailpipeEmissionsNote(car)}</p>
                )}
                {ghg && (
                  <InsightRow
                    label="Emissions score"
                    value={`${ghg.score}/10`}
                    plain={`${ghg.plain} (higher is cleaner).`}
                    tip="EPA’s greenhouse-gas score, 1–10. Higher means lower CO₂ per mile — a quick read on how clean the tailpipe is."
                  />
                )}
                {isEv && evCharge && (
                  <>
                    {hasNumericValue(evCharge.rangeMiles) && (
                      <DataRow label="EPA range" value={`${Math.round(evCharge.rangeMiles!)} mi`} />
                    )}
                    {hasNumericValue(evCharge.kWhPer100Mi) && (
                      <DataRow
                        label="Consumption"
                        value={`${evCharge.kWhPer100Mi} kWh/100mi · ${formatKwhPer100KmFromMi(evCharge.kWhPer100Mi!)}`}
                      />
                    )}
                    {hasNumericValue(evCharge.charge240Hours) && (
                      <InsightRow
                        label="Home charge (240V)"
                        value={`~${evCharge.charge240Hours} h`}
                        plain={`About ${evCharge.charge240Hours} hours to recharge from low on a 240V Level 2 home charger. Public DC fast chargers, where supported, are much quicker.`}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-500 leading-relaxed py-4">
                EPA fuel economy figures are not on file for this configuration.
              </p>
            )}
            {hasSafety && safetyScores.length > 0 ? (
              <>
                <Subheading>NHTSA crash tests</Subheading>
                <SafetyRow label="Overall" score={car.safetyRating!.overall} />
                <SafetyRow label="Frontal" score={car.safetyRating!.frontal} />
                <SafetyRow label="Side" score={car.safetyRating!.side} />
                <SafetyRow label="Rollover" score={car.safetyRating!.rollover} />
              </>
            ) : (
              <>
                <Subheading>Safety</Subheading>
                <p className="text-xs text-zinc-500 leading-relaxed py-2">{SAFETY_UNAVAILABLE_NOTE}</p>
              </>
            )}
          </ExpandableSection>

          <ExpandableSection title="Value & ownership cost" summary={valueSummary}>
            <p className="text-[10px] text-zinc-600 leading-relaxed pb-3">{CURRENCY_SECTION_NOTE}</p>
            <Subheading>Current market value</Subheading>
            <DataRow label="Est. value range" value={formatCurrencyRange(marketValue.low, marketValue.high)} />
            {marketValue.batteryHealth && (
              <>
                <DataRow label="Battery health (est.)" value={marketValue.batteryHealth.label} />
                <DataRow label="Pack note" value={marketValue.batteryHealth.chemistryNote} />
              </>
            )}
            {marketValue.conditionBands?.map((band) => (
              <DataRow key={band.label} label={band.label} value={formatCurrencyRange(band.low, band.high)} />
            ))}

            {hasEconomics ? (
              <>
                <Subheading>Annual running cost</Subheading>
                {annualCost.energy != null && (
                  <DataRow label="Fuel / energy" value={formatCurrency(annualCost.energy, true)} />
                )}
                <DataRow label="Insurance" value={formatCurrency(annualCost.insurance, true)} />
                <DataRow label="Maintenance" value={formatCurrency(annualCost.maintenance, true)} />
                <DataRow label="Tires" value={formatCurrency(annualCost.tires, true)} />
                <DataRow label="Registration" value={formatCurrency(annualCost.registration, true)} />
                <DataRow
                  label="Total per year"
                  value={formatCurrencyRange(annualCost.totalLow, annualCost.totalHigh)}
                />

                <Subheading>Resale projection</Subheading>
                <p className="text-xs text-zinc-500 leading-relaxed py-2">{resaleImpact.note}</p>
                <DataRow
                  label="Projected resale (5 yr)"
                  value={formatCurrencyRange(
                    resaleImpact.projectedResale5Year.low,
                    resaleImpact.projectedResale5Year.high,
                  )}
                />
                <DataRow
                  label="Est. value loss (5 yr)"
                  value={formatCurrencyRange(
                    resaleImpact.estimatedLoss5Year.low,
                    resaleImpact.estimatedLoss5Year.high,
                  )}
                />

                {ownership.tco5Year && (
                  <>
                    <Subheading>5-year lifecycle</Subheading>
                    <p className="text-xs text-zinc-500 leading-relaxed py-2">{ownership.tco5Year.disclaimer}</p>
                    <DataRow
                      label={ownership.tco5Year.mode === 'operating' ? 'Annual running cost' : '5-year total'}
                      value={formatCurrencyRange(ownership.tco5Year.low, ownership.tco5Year.high)}
                    />
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-500 leading-relaxed py-4 border-t border-zinc-900 mt-4">
                Full ownership cost estimates are not available for this configuration
                {isHydrogen ? ' (hydrogen fuel costs vary too widely to model reliably)' : ''}.
                Market value range above is still shown where the model can anchor it.
              </p>
            )}

            <button
              onClick={() => setShowTCO(true)}
              className="mt-6 w-full py-3 border border-zinc-700 text-[10px] font-black tracking-[0.25em] uppercase text-zinc-400 hover:border-white hover:text-white transition-colors"
            >
              Open TCO calculator
            </button>
          </ExpandableSection>
        </div>
      </div>

      <SimilarCars carId={car.id} />

      {showTCO && <TCOCalculator car={car} onClose={() => setShowTCO(false)} />}
    </div>
  );
}
