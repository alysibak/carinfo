import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { displayConfigSubtitle, displayModelLabel, displayVehicleTitle } from '../utils/trimLabel';
import { hasNumericValue } from '../utils/dataValue';
import { currencySectionNote } from '../utils/currency';
import { formatMoney, formatMoneyRange } from '../utils/money';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';
import { regionName, useRegionStore } from '../stores/regionStore';
import TCOCalculator from '../components/TCOCalculator';
import { StatusToast } from '../components/ui';
import ValuationLinks from '../components/ValuationLinks';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import KeyFigures from '../components/KeyFigures';
import RegionSelect from '../components/RegionSelect';
import PinnedCarBar from '../components/PinnedCarBar';
import KeySpecs from '../components/KeySpecs';
import SimilarCars from '../components/SimilarCars';
import SiblingConfigs from '../components/SiblingConfigs';
import DataTrustPanel from '../components/DataTrustPanel';
import { DataRow } from '../components/DataValue';
import { buildKeyFigures, buildSpecLine } from '../utils/keyFigures';
import { efficiencyOf, formatCo2, type Efficiency } from '../utils/efficiency';
import { formatCarFuelLabel } from '../utils/fuelDisplay';
import { formatKwhPer100KmFromMi } from '../utils/fuelEconomyUnits';
import { formatTransmissionLabel } from '../utils/trimLabel';
import {
  ghgFraming,
  phevModes,
  fiveYearFuelSavings,
  fuelSavingsSentence,
  type PhevModes,
} from '../utils/epaContent';
import type { AnnualCostBreakdown } from '../types/car.types';
import { TIER_HELPER } from '../utils/visualTiers';
import { usePageMeta } from '../utils/pageMeta';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';

function Subheading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-zinc-200 pt-3 pb-1">{children}</p>;
}

/**
 * Bar scales, so city and highway bars compare across every dossier. The bar
 * is fuel used, so a longer bar is a thirstier car, like the number beside it.
 */
const FUEL_BAR_SCALE: Record<Efficiency['unit'], number> = {
  'L/100 km': 20,
  'kWh/100 km': 40,
  'kg/100 km': 2,
};

const ANNUAL_COST_SEGMENTS: {
  key: keyof Pick<
    AnnualCostBreakdown,
    'energy' | 'insurance' | 'maintenance' | 'tires' | 'registration'
  >;
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

function FuelBar({ label, efficiency }: { label: string; efficiency: Efficiency | null }) {
  if (!efficiency) return null;
  const pct = Math.min(100, (efficiency.value / FUEL_BAR_SCALE[efficiency.unit]) * 100);
  return (
    <div className="py-2 border-b border-zinc-900 last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-zinc-400">{label}</span>
        <div className="text-right">
          <span className="text-xl font-bold tabular-nums text-white">
            {efficiency.value.toFixed(efficiency.unit === 'kg/100 km' ? 2 : 1)}
          </span>
          <span className="text-sm text-zinc-400"> {efficiency.unit}</span>
          {efficiency.epa && <p className="text-xs text-zinc-500 mt-0.5">{efficiency.epa}</p>}
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
            <span className="text-xs text-zinc-300">Electric mode</span>
            <span className="text-sm font-bold text-white">
              {modes.electricMpge} MPGe
              {hasNumericValue(modes.electricRangeMi) ? ` · ${modes.electricRangeMi} mi` : ''}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mt-1">
            Drives on battery power
            {hasNumericValue(modes.electricRangeMi)
              ? ` for about ${modes.electricRangeMi} miles`
              : ''}{' '}
            after a full charge, like an EV, then switches to gas automatically.
          </p>
        </div>
      )}
      {hasNumericValue(modes.gasMpg) && (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-zinc-300">Gas mode</span>
            <span className="text-sm font-bold text-white">{modes.gasMpg} MPG</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mt-1">
            Once the battery is used up it runs like a regular hybrid on gasoline. No plugging in
            required.
          </p>
        </div>
      )}
      {hasNumericValue(modes.chargeL2Hours) && (
        <p className="text-xs text-zinc-400 leading-relaxed">
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
  const [pinned, setPinned] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
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
        if (isHttpError(err) && err.status === 404) {
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

  // Pin the car's name and actions under the header once its figures scroll away.
  useEffect(() => {
    const el = statsRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [dashboard]);

  // The page's name is the one in its heading: the tab said "Civic 4Dr" while
  // the page said "Civic Si".
  const pageTitle = dashboard ? displayVehicleTitle(dashboard.car) : undefined;
  usePageMeta(
    pageTitle,
    pageTitle
      ? `EPA-verified specs, safety when available, and Ontario/CAD estimates for the ${pageTitle}.`
      : undefined,
  );

  if (loading) {
    return (
      <div className="min-h-[40vh] bg-black flex items-center justify-center opacity-50 py-16">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-zinc-800 border-t-zinc-500 mb-4" />
          <p className="text-xs text-zinc-300">Loading dossier</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    const missing = error === 'not-found';
    return (
      <div className="min-h-[40vh] bg-black flex items-center justify-center text-center px-4 py-16">
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
  const {
    marketValue,
    annualCost,
    resaleImpact,
    derivedComparison,
    assumptions,
    warnings,
    practicalityNote,
  } = ownership;
  const isHydrogen = car.engine.fuelType === 'hydrogen';
  const hydrogenPrice = getRegionalAssumptions(region).hydrogenCadPerKg;
  const isInCompare = comparedCars.some((c) => c.id === car.id);
  const title = displayVehicleTitle(car);
  const transmissionLabel = car.transmission?.type
    ? formatTransmissionLabel(car.transmission)
    : null;
  // The line under the title names the configuration; the gearbox is in the spec line.
  const trimLabel = displayConfigSubtitle(car);
  const configLabel = trimLabel && trimLabel !== transmissionLabel ? trimLabel : null;
  const specLine = buildSpecLine(dashboard);
  const isPhev = car.engine.fuelType === 'plug-in hybrid';
  const phev = phevModes(car);
  const ghg = ghgFraming(car);
  const hasFuelData = hasFuelEconomyData(car);
  const hasEconomics = annualCost.total != null;
  const hasMarketValue = hasNumericValue(marketValue.low) && hasNumericValue(marketValue.high);

  const hasEmissionsData =
    car.epa?.co2 != null ||
    hasNumericValue(car.epa?.ghgScore) ||
    hasNumericValue(car.epa?.barrelsPerYear) ||
    fiveYearFuelSavings(car) != null;

  const keyFigures = buildKeyFigures(dashboard);
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
  // A collector car's or never-sold car's figures are computed but not shown
  // (see the server's utils/unvalued.ts): its price follows auctions, or it
  // has no used market at all.
  const unvalued = ownership.unvalued;
  const showOwnership =
    !unvalued &&
    (hasEconomics ||
      Boolean(marketValue.batteryHealth) ||
      (marketValue.conditionBands?.length ?? 0) > 0 ||
      hasMarketValue);

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
    // In the header's spec line or figures.
    'horsepower',
    'engine',
    'displacement',
    'cylinders',
    'configuration',
    'transmission',
    'zeroToSixty',
  ];

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
    <div className="bg-black text-white">
      <StatusToast message={toast} />

      {isHydrogen && (
        <div className="border-b border-amber-900/50 bg-amber-950/20">
          <div className="page-wrap py-4 text-sm text-amber-200/90 leading-relaxed">
            <strong className="text-amber-100">Hydrogen fuel cell (FCEV).</strong> EPA&rsquo;s MPGe
            reads as miles per kilogram of hydrogen.{' '}
            {hydrogenPrice != null
              ? `Fuel cost uses ${regionName(region)}'s posted pump price, about $${hydrogenPrice.toFixed(2)}/kg; public stations are few, so check the one you would use.`
              : `${regionName(region)} has no posted retail hydrogen price${region === 'ontario' ? ' (its one public station is at Toronto Pearson)' : ''}, so fuel is left out of the yearly cost.`}
          </div>
        </div>
      )}

      <section className="border-b border-zinc-900">
        <div className="page-wrap-wide pt-2 pb-6 sm:pb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-zinc-400 hover:text-white transition-colors min-h-[44px] inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> Back
          </button>

          <div className="mt-1 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8">
            <div className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[9rem_1fr] gap-4 sm:gap-6 items-center min-w-0">
              <div className="h-14 sm:h-20 overflow-hidden">
                <VehiclePlaceholder car={car} compact hideCaption />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">
                  {title}
                </h1>
                <p className="text-sm sm:text-[15px] text-zinc-300 mt-1">
                  {(() => {
                    // "Electric SUV" already says SUV and electric: no "SUV · Electric SUV · Electric".
                    const cls = dashboard.competitiveClass?.toLowerCase() ?? '';
                    const body = car.bodyStyle ? bodyStyleLabel(car.bodyStyle) : null;
                    const fuel = car.engine.fuelType ? formatCarFuelLabel(car) : null;
                    return [
                      configLabel,
                      body && !cls.includes(body.toLowerCase()) ? body : null,
                      dashboard.competitiveClass,
                      fuel && !cls.includes(fuel.toLowerCase()) ? fuel : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                  })()}
                </p>
                {specLine.length > 0 && (
                  <p className="text-sm text-zinc-500 mt-1 tabular-nums">{specLine.join(' · ')}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAddToComparison}
                className={isInCompare ? 'btn-secondary' : 'btn-primary'}
              >
                {isInCompare ? 'In compare' : 'Add to compare'}
              </button>
              <button type="button" onClick={handleAddToGarage} className="btn-secondary">
                Save to garage
              </button>
            </div>
          </div>

          <div ref={statsRef} className="mt-5 sm:mt-6">
            <KeyFigures dashboard={dashboard} hasEstimates={showOwnership} />
          </div>
        </div>
      </section>

      {pinned && (
        <PinnedCarBar
          title={title}
          figures={
            keyFigures
              .filter((figure) => !figure.missing && figure.id !== 'engine')
              .map((figure) =>
                figure.id === 'safety'
                  ? `NHTSA ${figure.value}/5`
                  : `${figure.value}${figure.unit ? ` ${figure.unit}` : ''}`,
              )
              .join(' · ') || null
          }
          inCompare={isInCompare}
          onCompare={handleAddToComparison}
          onGarage={handleAddToGarage}
        />
      )}

      {car.ownershipProfile && (
        <div className="border-b border-zinc-900">
          <div className="page-wrap-wide py-3.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <p className="eyebrow shrink-0">Best for</p>
            <p className="text-sm text-zinc-300 min-w-0">
              <span className="font-semibold text-white">{car.ownershipProfile.label}</span>
              <span className="text-zinc-500"> · </span>
              {car.ownershipProfile.bestFor.join(' · ')}
            </p>
          </div>
        </div>
      )}

      <section className="border-b border-zinc-900">
        <div className="page-wrap-wide section-y-tight space-y-6">
          {(showEnergySection || hasSafetyBreakdown || hasEmissionsData) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-8 md:gap-y-10">
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
                      ? 'The figure above is gas mode, not a blend.'
                      : hasEvExtras && !hasCityHwy
                        ? 'Range is above; charge times below.'
                        : 'The combined figure is above; this is EPA’s city and highway split.'}
                  </p>
                  {isPhev && phev ? (
                    <PhevDualModeBlock modes={phev} />
                  ) : (
                    <>
                      <FuelBar label="City" efficiency={efficiencyOf(car, 'city')} />
                      <FuelBar label="Highway" efficiency={efficiencyOf(car, 'highway')} />
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

              {hasSafetyBreakdown &&
                (() => {
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
                    <div className="min-w-0 self-start">
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
                          <div
                            key={score.key}
                            className="bg-black px-2 sm:px-3 py-3.5 sm:py-4 text-center min-w-0"
                          >
                            <p className="text-xs text-zinc-500 mb-1 break-words">{score.label}</p>
                            <p className="text-lg sm:text-xl font-bold tabular-nums">
                              {score.value}
                              <span className="text-xs text-zinc-500">/5</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              {hasEmissionsData && (
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight mb-1">Tailpipe</h2>
                  <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                    EPA figures for this configuration.
                  </p>
                  {car.epa?.co2 != null && (
                    <DataRow
                      label="CO₂"
                      value={formatCo2(car.epa.co2)}
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
                </div>
              )}
            </div>
          )}

          {hasOverallSafety && !hasSafetyBreakdown && (
            <p className="text-xs text-zinc-500 leading-snug">
              <span className="font-medium text-zinc-400">Crash tests</span>
              {' · '}
              Overall stars are above; component scores are not on file for this configuration.
            </p>
          )}
        </div>
      </section>

      {showOwnership && (
        <section id="costs" className="border-b border-zinc-900 scroll-mt-32">
          <div className="page-wrap-wide section-y-tight">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight mb-1">Estimated costs</h2>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
                  {currencySectionNote(regionName(region))}
                </p>
                <RegionSelect className="mt-3" />
              </div>
              <ValuationLinks
                compact
                assumptions={assumptions}
                derivedComparison={derivedComparison}
                warnings={warnings}
                practicalityNote={practicalityNote}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-5 md:gap-y-6">
              <div className="min-w-0">
                {hasMarketValue && (
                  <DataRow
                    label="Est. value range"
                    value={formatMoneyRange(marketValue.low, marketValue.high)}
                    valueTier={1}
                    pairLayout
                  />
                )}
                {marketValue.batteryHealth && (
                  <>
                    <DataRow
                      label="Battery health"
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
                    value={formatMoneyRange(band.low, band.high)}
                    valueTier={2}
                    pairLayout
                  />
                ))}

                {hasEconomics ? (
                  <>
                    <Subheading>Yearly cost</Subheading>
                    {annualCost.energy != null ? (
                      <DataRow
                        label="Fuel / energy"
                        value={formatMoney(annualCost.energy)}
                        valueTier={2}
                        pairLayout
                      />
                    ) : (
                      isHydrogen && (
                        <DataRow
                          label="Fuel / energy"
                          value="Not included (no posted hydrogen price)"
                          valueTier={2}
                          pairLayout
                        />
                      )
                    )}
                    <DataRow
                      label="Insurance"
                      value={formatMoney(annualCost.insurance)}
                      valueTier={2}
                      pairLayout
                    />
                    <DataRow
                      label="Maintenance"
                      value={formatMoney(annualCost.maintenance)}
                      valueTier={2}
                      pairLayout
                    />
                    <DataRow
                      label="Tires"
                      value={formatMoney(annualCost.tires)}
                      valueTier={2}
                      pairLayout
                    />
                    <DataRow
                      label="Registration"
                      value={
                        annualCost.registration === 0
                          ? 'No renewal fee'
                          : formatMoney(annualCost.registration)
                      }
                      valueTier={2}
                      pairLayout
                    />
                    <DataRow
                      label="Total per year"
                      value={
                        annualCost.totalLow != null && annualCost.totalHigh != null
                          ? formatMoneyRange(annualCost.totalLow, annualCost.totalHigh)
                          : formatMoney(annualCost.total!)
                      }
                      valueTier={1}
                      pairLayout
                      total
                    />
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
                  <p className="text-xs text-zinc-500 leading-relaxed py-1 mb-1">
                    {resaleImpact.note}
                  </p>
                  <DataRow
                    label="Projected resale"
                    value={formatMoneyRange(
                      resaleImpact.projectedResale5Year.low,
                      resaleImpact.projectedResale5Year.high,
                    )}
                    valueTier={2}
                    pairLayout
                  />
                  <DataRow
                    label="Value lost"
                    value={formatMoneyRange(
                      resaleImpact.estimatedLoss5Year.low,
                      resaleImpact.estimatedLoss5Year.high,
                    )}
                    valueTier={2}
                    pairLayout
                  />
                  {ownership.tco5Year && (
                    <DataRow
                      label={
                        ownership.tco5Year.mode === 'operating'
                          ? 'Annual running cost'
                          : '5-year total'
                      }
                      value={formatMoneyRange(ownership.tco5Year.low, ownership.tco5Year.high)}
                      valueTier={2}
                      pairLayout
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTCO(true)}
                    className="btn-secondary mt-4"
                  >
                    Work out my own costs
                  </button>
                </div>
              )}
            </div>

            {!hasEconomics && (
              <button type="button" onClick={() => setShowTCO(true)} className="btn-secondary mt-4">
                Work out my own costs
              </button>
            )}
          </div>
        </section>
      )}

      {unvalued && (
        <section className="border-b border-zinc-900">
          <div className="page-wrap-wide section-y-tight">
            <h2 className="text-base font-bold tracking-tight mb-1">Value and costs</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">{unvalued.note}</p>
          </div>
        </section>
      )}

      <KeySpecs dashboard={dashboard} omitKeys={specOmitKeys} heading="More specs" />

      <DataTrustPanel dashboard={dashboard} />

      <SiblingConfigs car={car} />

      <SimilarCars car={car} />

      {showTCO && (
        <TCOCalculator
          car={car}
          ownership={dashboard?.ownership}
          region={region}
          onClose={() => setShowTCO(false)}
        />
      )}
    </div>
  );
}
