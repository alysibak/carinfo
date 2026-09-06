import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import * as api from '../services/api';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { displayListingSubtitle, displayModelLabel } from '../utils/trimLabel';
import {
  formatCurrency,
  formatCurrencyRange,
  hasNumericValue,
  SAFETY_UNAVAILABLE_NOTE,
} from '../utils/dataValue';
import { CURRENCY_SECTION_NOTE } from '../utils/currency';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';
import { useRegionStore } from '../stores/regionStore';
import TCOCalculator from '../components/TCOCalculator';
import { StatusToast } from '../components/ui';
import ValuationLinks from '../components/ValuationLinks';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import GlanceRow from '../components/GlanceRow';
import KeySpecs from '../components/KeySpecs';
import SimilarCars from '../components/SimilarCars';
import SiblingConfigs from '../components/SiblingConfigs';
import DataTrustPanel from '../components/DataTrustPanel';
import { DataRow } from '../components/DataValue';
import { buildGlanceMetrics } from '../utils/glanceMetrics';
import { efficiencyUnit } from '../utils/fuelLabels';
import { formatFuelBadge } from '../utils/fuelDisplay';
import { efficiencySecondaryLine, formatKwhPer100KmFromMi } from '../utils/fuelEconomyUnits';
import { ghgFraming, phevModes, fiveYearFuelSavings, fuelSavingsSentence, type PhevModes } from '../utils/epaContent';
import type { AnnualCostBreakdown } from '../types/car.types';
import { TIER_HELPER } from '../utils/visualTiers';
import { usePageMeta } from '../utils/pageMeta';

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-widest text-zinc-400 uppercase pt-2 pb-1">
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
    <div className="py-2 border-b border-zinc-900 last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] tracking-widest text-zinc-400 uppercase">{label}</span>
        <div className="text-right">
          <span className="text-xl font-bold tabular-nums text-white">{Math.round(value!)}</span>
          {secondary && <p className="text-[11px] text-zinc-400 mt-0.5">{secondary}</p>}
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
    <div className="py-1 space-y-3">
      {hasNumericValue(modes.electricMpge) && (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[10px] tracking-[0.25em] text-zinc-300 uppercase">Electric mode</span>
            <span className="text-sm font-bold text-white">
              {modes.electricMpge} MPGe
              {hasNumericValue(modes.electricRangeMi) ? ` · ${modes.electricRangeMi} mi` : ''}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
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
          <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
            Once the battery is used up it runs like a regular hybrid on gasoline. No plugging in required.
          </p>
        </div>
      )}
      {hasNumericValue(modes.chargeL2Hours) && (
        <p className="text-[11px] text-zinc-400 leading-relaxed">
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
  const { addOrReplaceOldestInComparison, comparedCars } = useCarStore();
  const addToGarage = useGarageStore((s) => s.add);
  const region = useRegionStore((s) => s.region);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setDashboard(null);
    setError(null);
    setLoading(true);
    const region = useRegionStore.getState().region;
    api
      .getCarDashboard(id, region)
      .then(setDashboard)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('not-found');
        } else {
          setError('load-failed');
        }
      })
      .finally(() => setLoading(false));
  }, [id, region]);

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
    const missing = error === 'not-found';
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-center px-4">
        <div className="max-w-md">
          <p className="text-2xl font-bold tracking-tight text-white mb-3">
            {missing ? 'Vehicle not on file' : 'Could not load this vehicle'}
          </p>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            {missing
              ? 'That id is not in the EPA catalog. Search by make and model instead.'
              : 'The dossier request failed. Check your connection and try again.'}
          </p>
          <Link to="/home" className="btn-primary text-xs">
            Search vehicles
          </Link>
        </div>
      </div>
    );
  }

  const { car, ownership, evCharge } = dashboard;
  const { marketValue, annualCost, resaleImpact, derivedComparison, assumptions, warnings, practicalityNote } =
    ownership;
  const isHydrogen = car.engine.fuelType === 'hydrogen';
  const efficiencyLabel = efficiencyUnit(car);
  const isInCompare = comparedCars.some((c) => c.id === car.id);
  const trimLabel = displayListingSubtitle(car);
  const isPhev = car.engine.fuelType === 'plug-in hybrid';
  const phev = phevModes(car);
  const ghg = ghgFraming(car);
  const hasFuelData = hasFuelEconomyData(car);
  const hasEconomics = annualCost.total != null;
  const hasMarketValue =
    hasNumericValue(marketValue.low) && hasNumericValue(marketValue.high);

  const hasEmissionsData =
    car.epa?.co2 != null ||
    hasNumericValue(car.epa?.ghgScore) ||
    hasNumericValue(car.epa?.barrelsPerYear) ||
    fiveYearFuelSavings(car) != null;

  const glanceIds = new Set(buildGlanceMetrics(dashboard).cells.map((cell) => cell.id));
  const hasCityHwy =
    hasNumericValue(car.fuelEconomy.city) || hasNumericValue(car.fuelEconomy.highway);
  const hasEvExtras =
    hasNumericValue(evCharge?.kWhPer100Mi) ||
    hasNumericValue(evCharge?.charge240Hours) ||
    hasNumericValue(evCharge?.charge120Hours ?? car.epa?.charge120Hours);
  const showEnergySection =
    (hasFuelData && hasCityHwy && !isPhev) || Boolean(isPhev && phev) || hasEvExtras;
  const hasOverallSafety = hasNumericValue(car.safetyRating?.overall, { allowZero: false });
  const hasSafetyBreakdown =
    hasNumericValue(car.safetyRating?.frontal, { allowZero: false }) ||
    hasNumericValue(car.safetyRating?.side, { allowZero: false }) ||
    hasNumericValue(car.safetyRating?.rollover, { allowZero: false });
  const showOwnership =
    hasEconomics ||
    Boolean(marketValue.batteryHealth) ||
    (marketValue.conditionBands?.length ?? 0) > 0 ||
    (hasMarketValue && !glanceIds.has('value'));

  const specOmitKeys = [
    'mpgCity',
    'mpgHighway',
    'mpgCombined',
    'phevElectricMpge',
    'phevRange',
    'phevGas',
    'phevBlended',
    'phevCharge',
    'epaRange',
    'kwh',
    'charge240',
    'charge120',
    'annualFuel',
    'safetyOverall',
    'safetyFrontal',
    'safetySide',
    'safetyRollover',
    'msrp',
    'valueConfidence',
    'co2',
    'ghg',
    'barrels',
    'fuelSav5',
    'body',
    'trim',
    'fuel',
    'drivetrain',
  ];
  if (glanceIds.has('power')) specOmitKeys.push('horsepower');
  if (glanceIds.has('engine')) {
    specOmitKeys.push('engine', 'displacement', 'cylinders', 'configuration');
  }
  if (glanceIds.has('range')) specOmitKeys.push('epaRange');

  const handleAddToComparison = () => {
    const res = addOrReplaceOldestInComparison(car);
    if (!res.ok) {
      setToast(res.message);
      return;
    }
    if (res.swappedOut) {
      setToast(
        `Replaced ${res.swappedOut.year} ${res.swappedOut.make} ${displayModelLabel(res.swappedOut)}`,
      );
      return;
    }
    setToast('Added to compare');
  };

  const handleAddToGarage = async () => {
    const res = await Promise.resolve(addToGarage(car));
    if (!res.ok && res.reason === 'duplicate') {
      setToast('Already in garage');
      return;
    }
    if (!res.ok && res.reason === 'limit') {
      setToast(res.message ?? 'Garage limit reached. Upgrade to Pro.');
      return;
    }
    setToast('Added to garage');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <StatusToast message={toast} />

      <div className="border-b border-zinc-900">
        <div className="page-wrap-wide py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-zinc-500 hover:text-white transition-colors shrink-0"
          >
            ← <span className="hidden sm:inline">Back</span>
          </button>
          <p className="text-sm font-semibold tracking-tight truncate text-center min-w-0">
            {car.year} {car.make} {car.model}
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleAddToGarage}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              + Garage
            </button>
            <button
              onClick={handleAddToComparison}
              className={`text-xs transition-colors ${
                isInCompare ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isInCompare ? 'In compare' : '+ Compare'}
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
        <div className="page-wrap-wide py-5 md:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-4 sm:gap-6 items-end">
            <div className="h-20 sm:h-24 overflow-hidden">
              <VehiclePlaceholder car={car} compact hideCaption />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-zinc-500 mb-0.5">
                {car.year} {car.make}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 break-words">
                {displayModelLabel(car)}
              </h1>
              {trimLabel && (
                <p className="text-sm text-zinc-500 mb-2">{trimLabel}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-400">
                {car.bodyStyle && <span className="capitalize">{car.bodyStyle}</span>}
                {car.driveType && <span>{car.driveType}</span>}
                {car.engine.fuelType && <span>{formatFuelBadge(car.engine.fuelType)}</span>}
              </div>
            </div>
          </div>
        </div>

        <GlanceRow dashboard={dashboard} />
      </div>

      <DataTrustPanel dashboard={dashboard} />

      <SiblingConfigs car={car} />

      {car.ownershipProfile && (
        <div className="border-b border-zinc-900">
          <div className="page-wrap-wide py-3.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500 shrink-0">Best for</p>
            <p className="text-sm text-zinc-300 min-w-0">
              <span className="font-semibold text-white">{car.ownershipProfile.label}</span>
              <span className="text-zinc-500"> · </span>
              {car.ownershipProfile.bestFor.join(' · ')}
            </p>
          </div>
        </div>
      )}

      <section className="border-b border-zinc-900">
        <div className="page-wrap-wide py-6 md:py-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {showEnergySection && (
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight mb-1">
                  {isPhev
                    ? 'Electric and gas modes'
                    : hasEvExtras && hasCityHwy
                      ? 'Energy use'
                      : hasEvExtras
                        ? 'Charging'
                        : 'City and highway'}
                </h2>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  {isPhev
                    ? 'Glance figure is gas-mode, not a blend.'
                    : hasEvExtras && !hasCityHwy
                      ? 'Range is above; charge times below.'
                      : 'Combined is above; this is the EPA split.'}
                </p>
                {isPhev && phev ? (
                  <PhevDualModeBlock modes={phev} />
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
                  </>
                )}
                {hasEvExtras && (
                  <>
                    {hasNumericValue(evCharge?.kWhPer100Mi) && (
                      <DataRow
                        label="Consumption"
                        value={`${evCharge!.kWhPer100Mi} kWh/100mi · ${formatKwhPer100KmFromMi(evCharge!.kWhPer100Mi!)}`}
                        glossaryKey="kwhPer100mi"
                      />
                    )}
                    {hasNumericValue(evCharge?.charge240Hours) && (
                      <DataRow
                        label="Home charge (240V)"
                        value={`~${evCharge!.charge240Hours} h`}
                        glossaryKey="charge240"
                      />
                    )}
                    {hasNumericValue(evCharge?.charge120Hours ?? car.epa?.charge120Hours) && (
                      <DataRow
                        label="Home charge (120V)"
                        value={`~${evCharge?.charge120Hours ?? car.epa!.charge120Hours} h`}
                        glossaryKey="charge120"
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {hasSafetyBreakdown && (() => {
              const scores = [
                hasNumericValue(car.safetyRating?.frontal, { allowZero: false }) && {
                  key: 'frontal',
                  label: 'Frontal',
                  value: car.safetyRating!.frontal!,
                },
                hasNumericValue(car.safetyRating?.side, { allowZero: false }) && {
                  key: 'side',
                  label: 'Side',
                  value: car.safetyRating!.side!,
                },
                hasNumericValue(car.safetyRating?.rollover, { allowZero: false }) && {
                  key: 'rollover',
                  label: 'Rollover',
                  value: car.safetyRating!.rollover!,
                },
              ].filter(Boolean) as { key: string; label: string; value: number }[];

              return (
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight mb-1">Crash tests</h2>
                  <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                    Overall is above. NHTSA tests specific configurations — scores may apply to
                    closely related trims of the same model year.
                  </p>
                  <div
                    className={`grid gap-px bg-zinc-800 ${
                      scores.length >= 3
                        ? 'grid-cols-3'
                        : scores.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-1'
                    }`}
                  >
                    {scores.map((score) => (
                      <div key={score.key} className="bg-black px-2 py-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">
                          {score.label}
                        </p>
                        <p className="text-xl font-bold tabular-nums">
                          {score.value}
                          <span className="text-[10px] text-zinc-500">/5</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!hasOverallSafety && !hasSafetyBreakdown && (
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight mb-1">Crash tests</h2>
                <p className="text-xs text-zinc-500 leading-relaxed">{SAFETY_UNAVAILABLE_NOTE}</p>
                <p className="text-xs text-zinc-600 mt-2">
                  <a href="#similar" className="underline underline-offset-2 hover:text-zinc-400">
                    Compare nearby alternatives
                  </a>
                  {' · '}
                  <Link to="/methodology" className="underline underline-offset-2 hover:text-zinc-400">
                    How we match NHTSA
                  </Link>
                </p>
              </div>
            )}

            {hasOverallSafety && !hasSafetyBreakdown && (
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight mb-1">Crash tests</h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Overall stars are above. NHTSA tests specific configurations — scores may apply to
                  closely related trims of the same model year. Component scores are not on file for
                  this EPA configuration.
                </p>
              </div>
            )}

            {hasEmissionsData && (
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight mb-1">Tailpipe</h2>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  EPA figures for this configuration.
                </p>
                {car.epa?.co2 != null && (
                  <DataRow label="CO₂" value={`${car.epa.co2} g/mi`} allowZero glossaryKey="co2" />
                )}
                {ghg && (
                  <DataRow label="Emissions score" value={`${ghg.score}/10`} glossaryKey="ghgScore" />
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
              </div>
            )}
          </div>
        </section>

      {showOwnership && (
        <section className="border-b border-zinc-900">
          <div className="page-wrap-wide py-6 md:py-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight mb-1">Cost to keep</h2>
                <p className="text-xs text-zinc-500 leading-relaxed">{CURRENCY_SECTION_NOTE}</p>
              </div>
              <ValuationLinks
                compact
                assumptions={assumptions}
                derivedComparison={derivedComparison}
                warnings={warnings}
                practicalityNote={practicalityNote}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div className="min-w-0">
                {hasMarketValue && !glanceIds.has('value') && (
                  <DataRow
                    label="Est. value range"
                    value={formatCurrencyRange(marketValue.low, marketValue.high)}
                    valueTier={1}
                    pairLayout
                  />
                )}
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
                    <Subheading>Yearly cost</Subheading>
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
                    {!glanceIds.has('running') && (
                      <DataRow
                        label="Total per year"
                        value={formatCurrencyRange(annualCost.totalLow, annualCost.totalHigh)}
                        valueTier={1}
                        pairLayout
                        total
                      />
                    )}
                    <AnnualCostStackBar annualCost={annualCost} />
                  </>
                ) : (
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Running-cost breakdown is not modeled for this configuration
                    {isHydrogen ? ' (hydrogen fuel costs vary too widely)' : ''}.
                  </p>
                )}
              </div>

              {hasEconomics && (
                <div className="min-w-0">
                  <Subheading>After five years</Subheading>
                  <p className="text-xs text-zinc-500 leading-relaxed py-1 mb-1">{resaleImpact.note}</p>
                  <DataRow
                    label="Projected resale"
                    value={formatCurrencyRange(
                      resaleImpact.projectedResale5Year.low,
                      resaleImpact.projectedResale5Year.high,
                    )}
                    valueTier={2}
                    pairLayout
                  />
                  <DataRow
                    label="Est. value loss"
                    value={formatCurrencyRange(
                      resaleImpact.estimatedLoss5Year.low,
                      resaleImpact.estimatedLoss5Year.high,
                    )}
                    valueTier={2}
                    pairLayout
                  />
                  {ownership.tco5Year && (
                    <DataRow
                      label={
                        ownership.tco5Year.mode === 'operating' ? 'Annual running cost' : '5-year total'
                      }
                      value={formatCurrencyRange(ownership.tco5Year.low, ownership.tco5Year.high)}
                      valueTier={2}
                      pairLayout
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTCO(true)}
                    className="mt-4 text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
                  >
                    Custom TCO calculator
                  </button>
                </div>
              )}
            </div>

            {!hasEconomics && (
              <button
                type="button"
                onClick={() => setShowTCO(true)}
                className="mt-4 text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
              >
                Custom TCO calculator
              </button>
            )}
          </div>
        </section>
      )}

      <KeySpecs dashboard={dashboard} omitKeys={specOmitKeys} heading="Also on file" />

      <SimilarCars car={car} />

      {showTCO && <TCOCalculator car={car} onClose={() => setShowTCO(false)} />}

    </div>
  );
}
