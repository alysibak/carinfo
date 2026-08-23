import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { displayListingSubtitle } from '../utils/trimLabel';
import {
  formatCurrency,
  formatCurrencyRange,
  formatPowerForCard,
  hasNumericValue,
} from '../utils/dataValue';
import { CURRENCY_SECTION_NOTE } from '../utils/currency';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';
import TCOCalculator from '../components/TCOCalculator';
import { ExpandableSection } from '../components/ui';
import ValuationLinks from '../components/ValuationLinks';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import GlanceRow from '../components/GlanceRow';
import KeySpecs from '../components/KeySpecs';
import SimilarCars from '../components/SimilarCars';
import DataTrustPanel from '../components/DataTrustPanel';
import { DataRow } from '../components/DataValue';
import { efficiencyUnit } from '../utils/fuelLabels';
import { formatFuelBadge, formatPowertrainLabel } from '../utils/fuelDisplay';
import { efficiencySecondaryLine, formatKwhPer100KmFromMi } from '../utils/fuelEconomyUnits';
import { ghgFraming, phevModes, fiveYearFuelSavings, fuelSavingsSentence, type PhevModes } from '../utils/epaContent';
import { SpecLabel } from '../components/SpecExplain';
import type { TrustFilter } from '../utils/dataTrust';
import type { AnnualCostBreakdown } from '../types/car.types';
import { TIER_HELPER } from '../utils/visualTiers';
import { usePageMeta } from '../utils/pageMeta';

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-widest text-zinc-500 uppercase pt-4 pb-1">
      {children}
    </p>
  );
}

/** Fixed scale so city / highway / combined bars are comparable on the dossier. */
const FUEL_BAR_SCALE_MAX = 60;

const ANNUAL_COST_SEGMENTS: {
  key: keyof Pick<AnnualCostBreakdown, 'energy' | 'insurance' | 'maintenance' | 'tires' | 'registration'>;
  label: string;
  color: string;
}[] = [
  { key: 'energy', label: 'Fuel / energy', color: 'bg-zinc-300' },
  { key: 'insurance', label: 'Insurance', color: 'bg-zinc-400' },
  { key: 'maintenance', label: 'Maintenance', color: 'bg-zinc-500' },
  { key: 'tires', label: 'Tires', color: 'bg-zinc-600' },
  { key: 'registration', label: 'Registration', color: 'bg-zinc-700' },
];

function AnnualCostStackBar({ annualCost }: { annualCost: AnnualCostBreakdown }) {
  const total = annualCost.total;
  if (total == null || total <= 0) return null;

  const segments = ANNUAL_COST_SEGMENTS.flatMap(({ key, label, color }) => {
    const value = annualCost[key];
    if (value == null || value <= 0) return [];
    return [{ key, label, color, value }];
  });

  if (segments.length === 0) return null;

  return (
    <div className="max-w-md mt-2 mb-1">
      <div className="flex h-2 w-full overflow-hidden rounded-sm bg-zinc-900" aria-hidden>
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`${seg.color} min-w-0`}
            style={{ width: `${(seg.value / total) * 100}%` }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 shrink-0 ${seg.color}`} aria-hidden />
            <span className={TIER_HELPER}>
              {seg.label} {Math.round((seg.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
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
        <span className="text-[10px] tracking-widest text-zinc-500 uppercase">{label}</span>
        <div className="text-right">
          <span className="text-2xl font-bold tabular-nums text-white">{Math.round(value!)}</span>
          {secondary && <p className="text-xs text-zinc-500 mt-0.5">{secondary}</p>}
        </div>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
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
            charge, like an EV, then switches to gas automatically.
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
            Once the battery is used up it runs like a regular hybrid on gasoline. No plugging in required.
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
  const [trustFilter, setTrustFilter] = useState<TrustFilter>('all');
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

  usePageMeta(
    dashboard ? `${dashboard.car.year} ${dashboard.car.make} ${dashboard.car.model}` : undefined,
    dashboard
      ? `EPA-verified specs, safety when available, and Ontario/CAD estimates for the ${dashboard.car.year} ${dashboard.car.make} ${dashboard.car.model}.`
      : undefined,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center opacity-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-zinc-800 border-t-zinc-500 mb-4" />
          <p className="text-xs tracking-widest text-zinc-300 uppercase">Loading dossier</p>
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
  const isInCompare = comparedCars.some((c) => c.id === car.id);
  const trimLabel = displayListingSubtitle(car);
  const isPhev = car.engine.fuelType === 'plug-in hybrid';
  const phev = phevModes(car);
  const ghg = ghgFraming(car);
  const hasFuelData = hasFuelEconomyData(car);
  const hasEconomics = annualCost.total != null;
  const hasSafety = hasNumericValue(car.safetyRating?.overall, { allowZero: false });
  const hasMarketValue =
    hasNumericValue(marketValue.low) && hasNumericValue(marketValue.high);

  const fuelSummary = hasFuelData
    ? `${Math.round(car.fuelEconomy.combined ?? 0)} ${efficiencyLabel} combined`
    : 'Expand for details';

  const hasEmissionsData =
    car.epa?.co2 != null ||
    hasNumericValue(car.epa?.ghgScore) ||
    hasNumericValue(car.epa?.barrelsPerYear) ||
    fiveYearFuelSavings(car) != null;

  const emissionsSummary = ghg
    ? `Emissions score ${ghg.score}/10`
    : car.epa?.co2 != null
      ? `${car.epa.co2} g/mi CO₂`
      : 'EPA emissions data';

  const safetySummary = hasSafety
    ? `NHTSA ${car.safetyRating!.overall}/5 stars`
    : '';

  const valueSummary =
    hasMarketValue && hasEconomics
      ? `Est. value ${formatCurrencyRange(marketValue.low, marketValue.high)} · Annual running cost ${formatCurrencyRange(annualCost.totalLow, annualCost.totalHigh)}/yr`
      : hasEconomics
        ? `Annual running cost ${formatCurrencyRange(annualCost.totalLow, annualCost.totalHigh)}/yr`
        : hasMarketValue
          ? `Est. value ${formatCurrencyRange(marketValue.low, marketValue.high)}`
          : '';

  const handleAddToComparison = () => {
    addCarToComparison(car);
    setToast('Added to compare');
  };

  const handleAddToGarage = async () => {
    const res = await Promise.resolve(addToGarage(car));
    if (!res.ok && res.reason === 'duplicate') {
      setToast('Already in garage');
      return;
    }
    if (!res.ok && res.reason === 'limit') {
      setToast(res.message ?? 'Garage limit reached — upgrade to Pro');
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
            <strong className="text-amber-100">Hydrogen fuel cell (FCEV).</strong> MPGe is from EPA tests, not
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
              <p className="text-6xl md:text-7xl font-black text-zinc-800 leading-none mb-3 tracking-tight">{car.year}</p>
              <h1 className="text-3xl font-black uppercase tracking-tight mb-1">{car.make}</h1>
              <p className="text-xl font-medium text-zinc-300 mb-1">{car.model}</p>
              {trimLabel && (
                <p className="text-xs tracking-widest text-zinc-500 uppercase mb-4">{trimLabel}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {car.bodyStyle && (
                  <span className="spec-chip">{car.bodyStyle}</span>
                )}
                {car.driveType && (
                  <span className="spec-chip">{car.driveType}</span>
                )}
                {car.engine.fuelType && (
                  <span className="spec-chip">{formatFuelBadge(car.engine.fuelType)}</span>
                )}
                {formatPowertrainLabel(car.engine.fuelType) && (
                  <span className="spec-chip">{formatPowertrainLabel(car.engine.fuelType)}</span>
                )}
                {hasNumericValue(car.engine.horsepower) && (
                  <span className="spec-chip">
                    {formatPowerForCard(car.engine.horsepower, {
                      fuelType: car.engine.fuelType,
                      powerProvenance: car.provenance?.['engine.horsepower'],
                    })}
                  </span>
                )}
                {hasSafety && (
                  <span className="spec-chip border-zinc-600">
                    NHTSA {car.safetyRating!.overall}/5
                  </span>
                )}
                {car.countryOfOrigin && (
                  <span className="spec-chip">{car.countryOfOrigin}</span>
                )}
              </div>
              {car.ownershipProfile && (
                <div className="mb-5 p-4 border border-zinc-800 bg-zinc-950 rounded-none">
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-2">Ownership profile</p>
                  <p className="text-base font-semibold text-white mb-3">{car.ownershipProfile.label}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {car.ownershipProfile.tags.map((tag) => (
                      <span key={tag} className="spec-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-2">Best for</p>
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

      <GlanceRow dashboard={dashboard} trustFilter={trustFilter} />

      <DataTrustPanel
        dashboard={dashboard}
        filter={trustFilter}
        onFilterChange={setTrustFilter}
      />

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
        <div className="space-y-3">
          {hasFuelData && (
            <ExpandableSection title="Fuel economy" summary={fuelSummary}>
              <p className="text-xs text-zinc-500 leading-relaxed pb-2">
                EPA test-cycle figures.{' '}
                <SpecLabel label="What is MPG?" glossaryKey="mpgCombined" />
              </p>
              {isPhev && phev ? (
                <>
                  <Subheading>Plug-in hybrid modes</Subheading>
                  <PhevDualModeBlock modes={phev} />
                </>
              ) : (
                <>
                  <FuelBar
                    label={`City ${efficiencyLabel}`}
                    value={car.fuelEconomy.city}
                    max={FUEL_BAR_SCALE_MAX}
                    secondary={efficiencySecondaryLine(car.fuelEconomy.city, efficiencyLabel)}
                  />
                  <FuelBar
                    label={`Highway ${efficiencyLabel}`}
                    value={car.fuelEconomy.highway}
                    max={FUEL_BAR_SCALE_MAX}
                    secondary={efficiencySecondaryLine(car.fuelEconomy.highway, efficiencyLabel)}
                  />
                  <FuelBar
                    label={`Combined ${efficiencyLabel}`}
                    value={car.fuelEconomy.combined}
                    max={FUEL_BAR_SCALE_MAX}
                    secondary={efficiencySecondaryLine(car.fuelEconomy.combined, efficiencyLabel)}
                  />
                </>
              )}
              {isEv && evCharge && (
                <>
                  <Subheading>Electric driving</Subheading>
                  {hasNumericValue(evCharge.rangeMiles) && (
                    <DataRow
                      label="EPA range"
                      value={`${Math.round(evCharge.rangeMiles!)} mi`}
                      glossaryKey="epaRange"
                    />
                  )}
                  {hasNumericValue(evCharge.kWhPer100Mi) && (
                    <DataRow
                      label="Consumption"
                      value={`${evCharge.kWhPer100Mi} kWh/100mi · ${formatKwhPer100KmFromMi(evCharge.kWhPer100Mi!)}`}
                      glossaryKey="kwhPer100mi"
                    />
                  )}
                  {hasNumericValue(evCharge.charge240Hours) && (
                    <DataRow
                      label="Home charge (240V)"
                      value={`~${evCharge.charge240Hours} h`}
                      glossaryKey="charge240"
                    />
                  )}
                </>
              )}
            </ExpandableSection>
          )}

          {hasSafety && (
            <ExpandableSection title="Crash safety" summary={safetySummary}>
              <p className="text-xs text-zinc-500 leading-relaxed pb-2">
                NHTSA star ratings for this make, model, and year.{' '}
                <SpecLabel label="What are NHTSA stars?" glossaryKey="safetyOverall" />
              </p>
              <DataRow
                label="Overall"
                value={`${car.safetyRating!.overall}/5 stars`}
                glossaryKey="safetyOverall"
              />
              {hasNumericValue(car.safetyRating?.frontal, { allowZero: false }) && (
                <DataRow
                  label="Frontal crash"
                  value={`${car.safetyRating!.frontal}/5`}
                  glossaryKey="safetyFrontal"
                />
              )}
              {hasNumericValue(car.safetyRating?.side, { allowZero: false }) && (
                <DataRow
                  label="Side crash"
                  value={`${car.safetyRating!.side}/5`}
                  glossaryKey="safetySide"
                />
              )}
              {hasNumericValue(car.safetyRating?.rollover, { allowZero: false }) && (
                <DataRow
                  label="Rollover"
                  value={`${car.safetyRating!.rollover}/5`}
                  glossaryKey="safetyRollover"
                />
              )}
            </ExpandableSection>
          )}

          {(hasEconomics || hasMarketValue) && (
          <ExpandableSection title="Value & ownership cost" summary={valueSummary}>
            <p className="text-[10px] text-zinc-600 leading-relaxed pb-3">{CURRENCY_SECTION_NOTE}</p>
            {marketValue.confidenceLabel && (
              <p className="text-xs text-zinc-500 pb-2">
                Value confidence: <span className="text-zinc-300">{marketValue.confidenceLabel}</span>
              </p>
            )}
            <Subheading>Current market value</Subheading>
            <DataRow
              label="Est. value range"
              value={formatCurrencyRange(marketValue.low, marketValue.high)}
              valueTier={1}
              pairLayout
            />
            {marketValue.batteryHealth && (
              <>
                <DataRow
                  label="Battery health (est.)"
                  value={marketValue.batteryHealth.label}
                  valueTier={2}
                  pairLayout
                />
                <DataRow
                  label="Pack note"
                  value={marketValue.batteryHealth.chemistryNote}
                  valueTier={2}
                  pairLayout
                />
              </>
            )}
            {marketValue.conditionBands?.map((band) => (
              <DataRow
                key={band.label}
                label={band.label}
                value={formatCurrencyRange(band.low, band.high)}
                valueTier={2}
                pairLayout
              />
            ))}

            {hasEconomics ? (
              <>
                <Subheading>Annual running cost</Subheading>
                {annualCost.energy != null && (
                  <DataRow
                    label="Fuel / energy"
                    value={formatCurrency(annualCost.energy, true)}
                    valueTier={2}
                    pairLayout
                  />
                )}
                <DataRow
                  label="Insurance"
                  value={formatCurrency(annualCost.insurance, true)}
                  valueTier={2}
                  pairLayout
                />
                <DataRow
                  label="Maintenance"
                  value={formatCurrency(annualCost.maintenance, true)}
                  valueTier={2}
                  pairLayout
                />
                <DataRow
                  label="Tires"
                  value={formatCurrency(annualCost.tires, true)}
                  valueTier={2}
                  pairLayout
                />
                <DataRow
                  label="Registration"
                  value={formatCurrency(annualCost.registration, true)}
                  valueTier={2}
                  pairLayout
                />
                <DataRow
                  label="Total per year"
                  value={formatCurrencyRange(annualCost.totalLow, annualCost.totalHigh)}
                  valueTier={1}
                  pairLayout
                  total
                />
                <AnnualCostStackBar annualCost={annualCost} />

                <Subheading>Resale projection</Subheading>
                <p className="text-xs text-zinc-500 leading-relaxed py-2">{resaleImpact.note}</p>
                <DataRow
                  label="Projected resale (5 yr)"
                  value={formatCurrencyRange(
                    resaleImpact.projectedResale5Year.low,
                    resaleImpact.projectedResale5Year.high,
                  )}
                  valueTier={2}
                  pairLayout
                />
                <DataRow
                  label="Est. value loss (5 yr)"
                  value={formatCurrencyRange(
                    resaleImpact.estimatedLoss5Year.low,
                    resaleImpact.estimatedLoss5Year.high,
                  )}
                  valueTier={2}
                  pairLayout
                />

                {ownership.tco5Year && (
                  <>
                    <Subheading>5-year lifecycle</Subheading>
                    <p className="text-xs text-zinc-500 leading-relaxed py-2">{ownership.tco5Year.disclaimer}</p>
                    <DataRow
                      label={ownership.tco5Year.mode === 'operating' ? 'Annual running cost' : '5-year total'}
                      value={formatCurrencyRange(ownership.tco5Year.low, ownership.tco5Year.high)}
                      valueTier={2}
                      pairLayout
                    />
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-500 leading-relaxed py-4 border-t border-zinc-900 mt-4">
                Running-cost breakdown is not modeled for this configuration
                {isHydrogen ? ' (hydrogen fuel costs vary too widely)' : ''}.
              </p>
            )}

            <button
              onClick={() => setShowTCO(true)}
              className="mt-6 w-full py-3 border border-zinc-700 text-[10px] font-black tracking-[0.25em] uppercase text-zinc-400 hover:border-white hover:text-white transition-colors"
            >
              Open TCO calculator
            </button>
          </ExpandableSection>
          )}

          {hasEmissionsData && (
            <ExpandableSection title="Emissions" summary={emissionsSummary}>
              {car.epa?.co2 != null && (
                <DataRow
                  label="CO₂"
                  value={`${car.epa.co2} g/mi`}
                  allowZero
                  glossaryKey="co2"
                />
              )}
              {ghg && (
                <DataRow
                  label="Emissions score"
                  value={`${ghg.score}/10`}
                  glossaryKey="ghgScore"
                />
              )}
              {hasNumericValue(car.epa?.barrelsPerYear) && (
                <DataRow
                  label="Oil use"
                  value={`${car.epa!.barrelsPerYear} barrels/yr`}
                  glossaryKey="barrelsPerYear"
                />
              )}
              {(() => {
                const fuelSav = fiveYearFuelSavings(car);
                return fuelSav ? (
                  <DataRow
                    label="5-yr fuel vs. average"
                    value={fuelSavingsSentence(fuelSav)}
                    glossaryKey="fuelSavings5yr"
                  />
                ) : null;
              })()}
            </ExpandableSection>
          )}
        </div>
      </div>

      <SimilarCars carId={car.id} />

      {showTCO && <TCOCalculator car={car} onClose={() => setShowTCO(false)} />}
    </div>
  );
}
