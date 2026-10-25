import { Link, useSearchParams } from 'react-router-dom';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useCarStore } from '../stores/carStore';
import type { CarDashboard, CarSpecs, Matchup } from '../types/car.types';
import * as api from '../services/api';
import { formatEngineForDetail, UNAVAILABLE_LABEL } from '../utils/dataValue';
import { formatCarFuelLabel } from '../utils/fuelDisplay';
import {
  displayListingSubtitle,
  displayModelLabel,
  formatTransmissionLabel,
} from '../utils/trimLabel';
import { efficiencyOf, rangeKm } from '../utils/efficiency';
import { formatMoney, formatMoneyRange, formatMoneyShort } from '../utils/money';
import { summarizeComparison } from '../utils/compareSummary';
import { fieldProvenanceSource } from '../utils/dataTrust';
import CarImage from '../components/CarImage';
import CarPhotoButton from '../components/CarPhotoButton';
import { StatusToast, LoadingScreen } from '../components/ui';
import { usePageMeta } from '../utils/pageMeta';
import { formatCompareIds, MAX_COMPARE, parseCompareIds } from '../utils/compareIds';
import { differentiateCars } from '../utils/differentiateCars';
import { regionName, useRegionStore } from '../stores/regionStore';
import Matchups from '../components/Matchups';
import AddCarSearch from '../components/AddCarSearch';
import RegionSelect from '../components/RegionSelect';
import { formatVolume, luggageLabel } from '../utils/space';
import { formatFeet, formatKg, formatLb, formatMetres } from '../utils/size';
import { availabilityLabel, rolloverRiskText } from '../utils/safetyTech';
import { complaintPart } from '../utils/recalls';
import { ordinal } from '@carinfo/shared/theft';
import { splitRecalls } from '@carinfo/shared/recall-scope';

function isUnavailable(value: string | number): boolean {
  return value === UNAVAILABLE_LABEL;
}

interface SpecRow {
  key: string;
  label: string;
  /** A second line under the label: "CAD", "combined". */
  hint?: string;
  provenanceKey?: string;
  isEstimatedRow?: boolean;
  getValue: (car: CarSpecs, dash: CarDashboard) => string | number;
  /** A small line under the value: the EPA figure beside a converted one. */
  getSub?: (car: CarSpecs, dash: CarDashboard) => string | null;
  getNumeric?: (car: CarSpecs, dash: CarDashboard) => number | null;
  higherIsBetter?: boolean;
  /** Numbers only compare in one unit: litres against kilowatt-hours crowns nobody. */
  unitOf?: (car: CarSpecs) => string | undefined;
}

/**
 * Rows from the records first, then the estimates as a group of their own:
 * the table used to open with estimated value and costs, above what EPA and
 * NHTSA measured.
 */
const ESTIMATE_ROWS = new Set(['price', 'running', 'energy', 'fiveYear', 'zeroToSixty']);
const ROW_ORDER = [
  'fuelUse',
  'fuelCity',
  'fuelHighway',
  'range',
  'safety',
  'rolloverRisk',
  'fcw',
  'ldw',
  'recalls',
  'complaints',
  'complaintPart',
  'theft',
  'length',
  'width',
  'height',
  'weight',
  'luggage',
  'passenger',
  'horsepower',
  'torque',
  'engine',
  'transmission',
  'driveType',
  'fuelType',
  'bodyStyle',
  'co2',
  'country',
  'price',
  'running',
  'energy',
  'fiveYear',
  'zeroToSixty',
];
/** A row left out of ROW_ORDER goes last, not first. */
const rowRank = (key: string) => {
  const i = ROW_ORDER.indexOf(key);
  return i === -1 ? ROW_ORDER.length : i;
};

const bodyLabel = (style: string) =>
  style === 'suv'
    ? 'SUV'
    : style === 'truck'
      ? 'Pickup'
      : style.charAt(0).toUpperCase() + style.slice(1);

function efficiencyRow(
  key: string,
  label: string,
  basis: 'combined' | 'city' | 'highway',
): SpecRow {
  return {
    key,
    label,
    provenanceKey: 'fuelEconomy.combined',
    getValue: (car) => efficiencyOf(car, basis)?.text ?? UNAVAILABLE_LABEL,
    getSub: (car) => efficiencyOf(car, basis)?.epa || null,
    getNumeric: (car) => efficiencyOf(car, basis)?.value ?? null,
    higherIsBetter: false,
    unitOf: (car) => efficiencyOf(car, basis)?.unit,
  };
}

/**
 * Rows in the order a decision is made: what it costs to buy and to keep,
 * what it burns, how safe it is, then what it is. Values are in CAD and
 * litres; the EPA's US-dollar fuel cost and its miles per gallon, the two
 * figures a Canadian shopper cannot use, are gone or demoted to a sub-line.
 */
const ALL_SPECS: SpecRow[] = [
  {
    key: 'price',
    label: 'Est. value',
    provenanceKey: 'price.msrp',
    getValue: (car, dash) => {
      if (dash.ownership.unvalued) return `${dash.ownership.unvalued.label}: not valued`;
      const { low, high, mid } = dash.ownership.marketValue;
      if (low > 0 && high > 0) return formatMoneyRange(low, high);
      if (mid > 0) return formatMoneyShort(mid);
      return car.price?.msrp ? formatMoneyShort(car.price.msrp) : UNAVAILABLE_LABEL;
    },
    getNumeric: (car, dash) =>
      dash.ownership.unvalued ? null : dash.ownership.marketValue.mid || car.price?.msrp || null,
    higherIsBetter: false,
  },
  {
    key: 'running',
    label: 'Yearly cost',
    hint: 'Fuel, insurance, upkeep',
    provenanceKey: 'analytics.annualCost',
    getValue: (_car, dash) =>
      dash.annualRunningCost && !dash.ownership.unvalued
        ? formatMoneyRange(dash.annualRunningCost.low, dash.annualRunningCost.high)
        : UNAVAILABLE_LABEL,
    getNumeric: (_car, dash) =>
      dash.ownership.unvalued ? null : (dash.annualRunningCost?.mid ?? null),
    higherIsBetter: false,
  },
  {
    key: 'energy',
    label: 'Fuel a year',
    provenanceKey: 'analytics.annualCost',
    getValue: (_car, dash) =>
      dash.ownership.annualCost.energy != null && !dash.ownership.unvalued
        ? formatMoney(dash.ownership.annualCost.energy)
        : UNAVAILABLE_LABEL,
    getNumeric: (_car, dash) =>
      dash.ownership.unvalued ? null : (dash.ownership.annualCost.energy ?? null),
    higherIsBetter: false,
  },
  {
    key: 'fiveYear',
    label: '5-year cost',
    hint: 'Running costs and value lost',
    provenanceKey: 'analytics.tco5Year',
    getValue: (_car, dash) =>
      dash.tco5Year && !dash.ownership.unvalued
        ? formatMoneyRange(dash.tco5Year.low, dash.tco5Year.high)
        : UNAVAILABLE_LABEL,
    getNumeric: (_car, dash) => (dash.ownership.unvalued ? null : (dash.tco5Year?.mid ?? null)),
    higherIsBetter: false,
  },
  efficiencyRow('fuelUse', 'Fuel use', 'combined'),
  efficiencyRow('fuelCity', 'City', 'city'),
  efficiencyRow('fuelHighway', 'Highway', 'highway'),
  {
    key: 'range',
    label: 'Range',
    provenanceKey: 'epa.rangeMiles',
    getValue: (car) =>
      car.epa?.rangeMiles ? `${rangeKm(car.epa.rangeMiles)} km` : UNAVAILABLE_LABEL,
    getSub: (car) => (car.epa?.rangeMiles ? `${Math.round(car.epa.rangeMiles)} mi` : null),
    getNumeric: (car) => car.epa?.rangeMiles ?? null,
    higherIsBetter: true,
  },
  {
    key: 'safety',
    label: 'NHTSA rating',
    provenanceKey: 'safetyRating.overall',
    getValue: (car) =>
      car.safetyRating?.overall != null && car.safetyRating.overall > 0
        ? `${car.safetyRating.overall}/5`
        : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.safetyRating?.overall ?? null,
    higherIsBetter: true,
  },
  {
    key: 'rolloverRisk',
    label: 'Rollover risk',
    hint: 'NHTSA, single-vehicle crash',
    getValue: (car) =>
      car.safetyRating?.rolloverRisk != null
        ? rolloverRiskText(car.safetyRating.rolloverRisk)
        : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.safetyRating?.rolloverRisk ?? null,
    higherIsBetter: false,
  },
  {
    key: 'fcw',
    label: 'Collision warning',
    hint: 'As NHTSA lists it',
    // "Not listed" only of a car NHTSA lists at all.
    getValue: (car) =>
      car.safetyRating?.nhtsaIds?.length
        ? availabilityLabel(car.safetyTech?.fcw)
        : UNAVAILABLE_LABEL,
  },
  {
    key: 'ldw',
    label: 'Lane departure warning',
    hint: 'As NHTSA lists it',
    getValue: (car) =>
      car.safetyRating?.nhtsaIds?.length
        ? availabilityLabel(car.safetyTech?.ldw)
        : UNAVAILABLE_LABEL,
  },
  {
    key: 'length',
    label: 'Length',
    hint: 'Transport Canada',
    getValue: (car) => (car.size ? formatMetres(car.size.lengthCm) : UNAVAILABLE_LABEL),
    getSub: (car) => (car.size ? formatFeet(car.size.lengthCm) : null),
  },
  {
    key: 'width',
    label: 'Width',
    hint: 'Transport Canada, without mirrors',
    getValue: (car) => (car.size ? formatMetres(car.size.widthCm) : UNAVAILABLE_LABEL),
    getSub: (car) => (car.size ? formatFeet(car.size.widthCm) : null),
  },
  {
    key: 'height',
    label: 'Height',
    hint: 'Transport Canada',
    getValue: (car) => (car.size ? formatMetres(car.size.heightCm) : UNAVAILABLE_LABEL),
    getSub: (car) => (car.size ? formatFeet(car.size.heightCm) : null),
  },
  {
    key: 'weight',
    label: 'Weight',
    hint: 'Transport Canada, empty',
    getValue: (car) => (car.size ? formatKg(car.size.curbWeightKg) : UNAVAILABLE_LABEL),
    getSub: (car) => (car.size ? formatLb(car.size.curbWeightKg) : null),
  },
  {
    key: 'luggage',
    label: 'Trunk or cargo',
    hint: 'EPA, every seat up',
    getValue: (car) =>
      car.epa?.luggageVolumeCuFt ? formatVolume(car.epa.luggageVolumeCuFt) : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.epa?.luggageVolumeCuFt ?? null,
    higherIsBetter: true,
    // EPA measures a trunk to its lid and a hatchback's cargo space to the
    // roof: a hatchback's bigger number is not a bigger trunk.
    unitOf: (car) => luggageLabel(car.bodyStyle),
  },
  {
    key: 'passenger',
    label: 'Room for passengers',
    hint: 'EPA',
    getValue: (car) =>
      car.epa?.passengerVolumeCuFt ? formatVolume(car.epa.passengerVolumeCuFt) : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.epa?.passengerVolumeCuFt ?? null,
    higherIsBetter: true,
  },
  {
    key: 'horsepower',
    label: 'Power',
    provenanceKey: 'engine.horsepower',
    getValue: (car) =>
      car.engine.horsepower != null ? `${car.engine.horsepower} hp` : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.engine.horsepower ?? null,
    higherIsBetter: true,
  },
  {
    key: 'torque',
    label: 'Torque',
    getValue: (car) =>
      car.engine.torque != null ? `${car.engine.torque} lb-ft` : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.engine.torque ?? null,
    higherIsBetter: true,
  },
  {
    key: 'zeroToSixty',
    label: '0–60 mph',
    provenanceKey: 'performance.zeroToSixty',
    getValue: (car, dash) => {
      if (dash.zeroToSixty) return `~${dash.zeroToSixty.value} s`;
      if (car.performance?.zeroToSixty) return `${car.performance.zeroToSixty.toFixed(1)} s`;
      return UNAVAILABLE_LABEL;
    },
    getNumeric: (car, dash) => dash.zeroToSixty?.value ?? car.performance?.zeroToSixty ?? null,
    higherIsBetter: false,
    isEstimatedRow: true,
  },
  {
    key: 'engine',
    label: 'Engine',
    getValue: (car) => formatEngineForDetail(car.engine),
  },
  {
    key: 'transmission',
    label: 'Gearbox',
    getValue: (car) => formatTransmissionLabel(car.transmission),
  },
  { key: 'driveType', label: 'Drive', getValue: (car) => car.driveType },
  { key: 'fuelType', label: 'Fuel', getValue: (car) => formatCarFuelLabel(car) },
  { key: 'bodyStyle', label: 'Body', getValue: (car) => bodyLabel(car.bodyStyle) },
  // Counts for the model year, not this configuration; not ranked, as a
  // count unadjusted for sales says little about one car against another.
  {
    key: 'recalls',
    label: 'Recalls in Canada',
    hint: 'Transport Canada, model year',
    getValue: (car, dash) =>
      dash.recalls
        ? String(
            splitRecalls(dash.recalls, {
              fuelType: car.engine.fuelType,
              mildHybrid: car.engine.mildHybrid,
            }).applies.length,
          )
        : UNAVAILABLE_LABEL,
    getSub: (car, dash) => {
      if (!dash.recalls) return null;
      const { other } = splitRecalls(dash.recalls, {
        fuelType: car.engine.fuelType,
        mildHybrid: car.engine.mildHybrid,
      });
      return other.length ? `+${other.length} for other versions` : null;
    },
  },
  {
    key: 'complaints',
    label: 'Owner complaints',
    hint: 'NHTSA, model year',
    getValue: (_car, dash) =>
      dash.complaints ? dash.complaints.complaints.toLocaleString('en-CA') : UNAVAILABLE_LABEL,
  },
  {
    key: 'complaintPart',
    label: 'Complained of most',
    hint: 'NHTSA, by part',
    getValue: (_car, dash) => {
      const top = dash.complaints?.parts[0];
      return top
        ? `${complaintPart(top[0])} (${top[1].toLocaleString('en-CA')})`
        : UNAVAILABLE_LABEL;
    },
  },
  {
    key: 'theft',
    label: 'Most stolen in Canada',
    hint: 'Équité Association, top 10',
    getValue: (_car, dash) =>
      dash.theft ? `${ordinal(dash.theft.rank)} in ${dash.theft.year}` : 'Not in the top 10',
  },
  {
    key: 'co2',
    label: 'CO₂',
    provenanceKey: 'epa.co2',
    getValue: (car) =>
      car.epa?.co2 != null ? `${Math.round(car.epa.co2 / 1.609344)} g/km` : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.epa?.co2 ?? null,
    higherIsBetter: false,
  },
  {
    key: 'country',
    // The make's home, not where this car was built: a Canadian RAV4 or
    // CR-V comes from Ontario.
    label: 'Brand origin',
    hint: 'Where the make is from, not where it was built',
    getValue: (car) => car.countryOfOrigin || UNAVAILABLE_LABEL,
  },
];

export default function Compare() {
  usePageMeta(
    'Compare',
    'Up to five cars side by side: fuel use, crash ratings, recalls in Canada, complaints and theft, from the public records.',
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    comparedCars,
    removeCarFromComparison,
    clearComparison,
    replaceComparison,
    addCarToComparison,
  } = useCarStore();
  const [dashboards, setDashboards] = useState<CarDashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const region = useRegionStore((s) => s.region);

  const comparedIds = useMemo(() => comparedCars.map((c) => c.id).join(','), [comparedCars]);

  useEffect(() => {
    const urlIds = parseCompareIds(searchParams.get('cars'));
    if (urlIds.length === 0) {
      setUrlHydrated(true);
      return;
    }
    let cancelled = false;
    api
      .compareCars(urlIds)
      .then((cars) => {
        if (!cancelled) replaceComparison(cars);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the cars in this compare link.');
      })
      .finally(() => {
        if (!cancelled) setUrlHydrated(true);
      });
    return () => {
      cancelled = true;
    };
    // Hydrate from the URL once per mount. Store changes write back below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!urlHydrated) return;
    const next = formatCompareIds(comparedCars.map((c) => c.id));
    const current = searchParams.get('cars') || '';
    if (next === current) return;
    setSearchParams(next ? { cars: next } : {}, { replace: true });
  }, [comparedCars, urlHydrated, searchParams, setSearchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (comparedCars.length === 0) {
      setDashboards([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all(comparedCars.map((c) => api.getCarDashboard(c.id, region)))
      .then((rows) => {
        if (!cancelled) setDashboards(rows);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load full comparison data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [comparedIds, comparedCars, region]);

  const dashboardById = useMemo(() => {
    const map = new Map<string, CarDashboard>();
    for (const d of dashboards) map.set(d.car.id, d);
    return map;
  }, [dashboards]);

  const urlHasCars = parseCompareIds(searchParams.get('cars')).length > 0;

  // A car found by name, into the comparison; the URL follows.
  const addFound = (car: CarSpecs) => {
    const result = addCarToComparison(car);
    if (!result.ok) setToast(result.message);
    else setAdding(false);
  };

  // A match-up's cars, straight into the comparison; the URL follows.
  const pickMatchup = async (matchup: Matchup) => {
    setLoadError(null);
    setPicking(matchup.label);
    try {
      replaceComparison(await api.compareCars(matchup.cars.map((car) => car.carId)));
    } catch {
      setLoadError('Could not load those cars. Try again.');
    } finally {
      setPicking(null);
    }
  };

  // Must run before any early return — Rules of Hooks.
  const diff = useMemo(() => differentiateCars(comparedCars), [comparedCars]);

  if (!urlHydrated && urlHasCars) {
    return <LoadingScreen label="Loading comparison" />;
  }

  if (comparedCars.length === 0) {
    return (
      <div className="bg-black text-white">
        <div className="page-wrap section-y max-w-3xl">
          <h1 className="page-title mb-3">Compare</h1>
          <p className="text-[15px] text-zinc-300 mb-8 max-w-xl leading-relaxed">
            Put up to five cars side by side: what each costs to buy and to run, what it burns, and
            how NHTSA rated it. Add cars from any search result or car page.
          </p>
          <div className="mb-8 max-w-xl">
            <AddCarSearch label="Start with a name" onAdd={addFound} />
          </div>
          <h2 className="eyebrow mb-3">Or a popular match-up</h2>
          {loadError && (
            <p role="alert" className="text-sm text-red-300 mb-3">
              {loadError}
            </p>
          )}
          <div className="mb-8">
            <Matchups onPick={(matchup) => void pickMatchup(matchup)} picking={picking} />
          </div>
          <h2 className="eyebrow mb-3">Or start from</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link to="/browse" className="choice-tile">
              <span>
                <span className="block text-[15px] text-white">A situation</span>
                <span className="block text-[13px] text-zinc-400">
                  Daily driver, family hauler, first car
                </span>
              </span>
              <span aria-hidden className="text-zinc-500">
                →
              </span>
            </Link>
            <Link to="/value-matrix" className="choice-tile">
              <span>
                <span className="block text-[15px] text-white">The whole market</span>
                <span className="block text-[13px] text-zinc-400">
                  Value against fuel use, on one chart
                </span>
              </span>
              <span aria-hidden className="text-zinc-500">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pairs = comparedCars.map((car) => ({
    car,
    dashboard: dashboardById.get(car.id),
  }));

  const specs = [...ALL_SPECS]
    .sort((a, b) => rowRank(a.key) - rowRank(b.key))
    .filter((spec) =>
      pairs.some(
        ({ car, dashboard }) => dashboard && !isUnavailable(spec.getValue(car, dashboard)),
      ),
    );

  const bestByRow = new Map<string, number>();
  if (pairs.length > 1 && !loading) {
    for (const spec of specs) {
      // "Best" is for what was measured, not for the cheapest estimate.
      if (!spec.getNumeric || ESTIMATE_ROWS.has(spec.key)) continue;
      const loaded = pairs.filter((p) => p.dashboard);
      // Units of the cars with a figure: a pickup with no trunk on file does
      // not stop two sedans' trunks from being compared.
      const units = loaded
        .filter((p) => spec.getNumeric!(p.car, p.dashboard!) != null)
        .map((p) => spec.unitOf?.(p.car));
      if (spec.unitOf && new Set(units).size > 1) continue;
      const values = loaded
        .map((p) => spec.getNumeric!(p.car, p.dashboard!))
        .filter((v): v is number => v != null);
      if (values.length < 2) continue;
      const sorted = [...values].sort((a, b) => (spec.higherIsBetter ? b - a : a - b));
      const [best, next] = sorted;
      // "Best" only where it is ahead by enough to matter: 203 hp against 200,
      // or 7.6 L/100 km against 7.8, crowned a winner nobody would notice.
      if (best !== next && Math.abs(best - next) / Math.abs(next || 1) >= 0.05) {
        bestByRow.set(spec.key, best);
      }
    }
  }

  const summary = loading ? [] : summarizeComparison(pairs);

  function resolveProvenance(dashboard: CarDashboard, spec: SpecRow) {
    if (!spec.provenanceKey) return null;
    if (spec.provenanceKey === 'performance.zeroToSixty' && dashboard.zeroToSixty) {
      return dashboard.zeroToSixty.method === 'actual' ? 'curated' : 'estimated';
    }
    if (spec.provenanceKey === 'epa.co2' || spec.provenanceKey === 'epa.rangeMiles') {
      return fieldProvenanceSource(dashboard, spec.provenanceKey) ?? 'epa';
    }
    return fieldProvenanceSource(dashboard, spec.provenanceKey);
  }

  return (
    <div className="bg-black text-white">
      <StatusToast message={toast} />
      <div className="border-b border-zinc-900">
        <div className="page-wrap py-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="page-title">Compare</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                {comparedCars.length} car{comparedCars.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {comparedCars.length < MAX_COMPARE && (
                <button
                  type="button"
                  aria-expanded={adding}
                  onClick={() => setAdding((open) => !open)}
                  className="btn-primary min-h-[40px]! py-2!"
                >
                  + Add a car
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setToast('Compare link copied');
                  } catch {
                    setToast('Copy the URL from the address bar');
                  }
                }}
                className="btn-secondary min-h-[40px]! py-2!"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={clearComparison}
                className="btn-ghost min-h-[40px] hover:text-red-300!"
              >
                Clear all
              </button>
            </div>
          </div>
          {loadError && <p className="text-sm text-amber-300/90 mt-3">{loadError}</p>}
          {adding && comparedCars.length < MAX_COMPARE && (
            <div className="mt-4 max-w-xl">
              <AddCarSearch
                autoFocus
                onAdd={addFound}
                addedIds={comparedCars.map((car) => car.id)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="page-wrap section-y-tight pb-12 sm:pb-16">
        {loading ? (
          <LoadingScreen label="Loading comparison" />
        ) : (
          <div className="max-w-7xl mx-auto min-w-0">
            {summary.length > 0 && (
              <section className="mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-zinc-800">
                <h2 className="eyebrow mb-3">In short</h2>
                <ul className="space-y-2.5">
                  {summary.map((line) => (
                    <li key={line.carId} className="text-[15px] sm:text-base leading-snug">
                      <span className="font-semibold text-white">{line.name}</span>
                      <span className="text-zinc-500"> — </span>
                      <span className="text-zinc-200">{line.sentence}</span>
                      {line.watch && (
                        <span className="block text-[13px] text-amber-300/90 mt-0.5">
                          Watch for: {line.watch}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {diff.axes.length > 0 && (
                  <p className="text-[13px] text-zinc-400 mt-4">{diff.axes.join(' · ')}</p>
                )}
              </section>
            )}
            {/* A phone shows the label column and two cars at once; more scroll sideways
                with the labels pinned. It used to cut the second car off mid-word. */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 overscroll-x-contain">
              <table className="w-full border-collapse table-fixed min-w-full">
                <colgroup>
                  <col className="w-23 sm:w-40" />
                  {pairs.map(({ car }) => (
                    <col key={car.id} className="w-34 sm:w-auto" />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="sticky left-0 z-10 bg-black px-3 sm:px-4 py-3 text-left align-bottom">
                      <span className="sr-only">Spec</span>
                    </th>
                    {pairs.map(({ car }) => (
                      <th
                        key={car.id}
                        className="px-2 sm:px-4 py-3 border-l border-zinc-800 align-top text-left sm:text-center font-normal"
                      >
                        <Link to={`/car/${car.id}`} className="block group/col">
                          <div className="aspect-video mb-2 overflow-hidden max-w-[140px] sm:max-w-[180px] sm:mx-auto">
                            <CarImage car={car} compact sizes="180px" />
                          </div>
                          <h2 className="text-sm sm:text-base font-semibold text-white leading-snug group-hover/col:underline underline-offset-4 decoration-zinc-600 wrap-break-word">
                            {car.year} {car.make} {displayModelLabel(car)}
                          </h2>
                          {displayListingSubtitle(car) && (
                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                              {displayListingSubtitle(car)}
                            </p>
                          )}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 sm:justify-center">
                          <CarPhotoButton
                            car={car}
                            label="Photo"
                            className="min-h-[36px] text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removeCarFromComparison(car.id)}
                            className="min-h-[36px] text-xs text-zinc-400 hover:text-red-300 transition-colors"
                            aria-label={`Remove the ${car.year} ${car.make} ${displayModelLabel(car)}`}
                          >
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec, index) => {
                    const estimate = ESTIMATE_ROWS.has(spec.key);
                    const startsGroup =
                      index === 0 || ESTIMATE_ROWS.has(specs[index - 1].key) !== estimate;
                    return (
                      <Fragment key={spec.key}>
                        {startsGroup && (
                          <tr className="border-b border-zinc-800">
                            <th
                              colSpan={pairs.length + 1}
                              scope="colgroup"
                              className="sticky left-0 bg-black px-3 sm:px-4 pt-6 pb-2.5 text-left font-normal"
                            >
                              <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="eyebrow">
                                  {estimate ? 'Estimates' : 'From the records'}
                                </span>
                                {estimate && (
                                  <>
                                    <span className="text-xs text-zinc-500">
                                      Model figures in CAD, not quotes
                                    </span>
                                    <RegionSelect />
                                  </>
                                )}
                              </span>
                            </th>
                          </tr>
                        )}
                        <tr className="border-b border-zinc-900">
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-black border-r border-zinc-800 px-3 sm:px-4 py-3 text-left font-normal align-top"
                          >
                            <span className="block text-[13px] text-zinc-300 leading-snug">
                              {spec.label}
                            </span>
                            {spec.hint && (
                              <span className="hidden sm:block text-xs text-zinc-500 mt-0.5">
                                {spec.hint}
                              </span>
                            )}
                          </th>
                          {pairs.map(({ car, dashboard }) => {
                            if (!dashboard) {
                              return (
                                <td
                                  key={car.id}
                                  className="px-2 sm:px-4 py-3 border-l border-zinc-800 text-zinc-400 text-xs"
                                >
                                  …
                                </td>
                              );
                            }
                            const best = bestByRow.get(spec.key);
                            const numeric = spec.getNumeric?.(car, dashboard) ?? null;
                            const isBest = best != null && numeric != null && numeric === best;
                            const raw = spec.getValue(car, dashboard);
                            const missing = isUnavailable(raw);
                            const sub = missing ? null : spec.getSub?.(car, dashboard);
                            const prov = resolveProvenance(dashboard, spec);
                            return (
                              <td
                                key={car.id}
                                className={`px-2 sm:px-4 py-3 border-l border-zinc-800 align-top sm:text-center ${
                                  isBest && !missing ? 'compare-win' : ''
                                }`}
                              >
                                {missing ? (
                                  <span className="text-xs text-zinc-500 italic">Not on file</span>
                                ) : (
                                  <>
                                    <span
                                      className={`text-sm sm:text-[15px] tabular-nums wrap-break-word ${
                                        isBest ? 'font-bold text-white' : 'text-zinc-100'
                                      }`}
                                    >
                                      {raw}
                                    </span>
                                    {isBest && (
                                      <span className="ml-1.5 inline-block text-xs font-semibold text-accent align-middle">
                                        Best
                                      </span>
                                    )}
                                    {sub && (
                                      <span className="block text-xs text-zinc-500 mt-0.5">
                                        {sub}
                                      </span>
                                    )}
                                    {prov === 'estimated' &&
                                      !ESTIMATE_ROWS.has(spec.key) &&
                                      !spec.isEstimatedRow && (
                                        <span className="block text-xs text-zinc-500 mt-0.5">
                                          est.
                                        </span>
                                      )}
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500 mt-4 leading-relaxed">
              Values and costs are estimates in CAD for {regionName(region)}; fuel use and CO₂ are
              EPA ratings, converted to litres and grams per kilometre.{' '}
              <Link to="/methodology" className="underline underline-offset-2 hover:text-zinc-300">
                How we estimate
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
