import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useCarStore } from '../stores/carStore';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import * as api from '../services/api';
import { formatEngineForDetail, UNAVAILABLE_LABEL } from '../utils/dataValue';
import { formatFuelTypeLabel, usesMpge } from '../utils/fuelDisplay';
import {
  displayListingSubtitle,
  displayModelLabel,
  formatTransmissionLabel,
} from '../utils/trimLabel';
import { fieldProvenanceSource } from '../utils/dataTrust';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import { StatusToast, LoadingScreen } from '../components/ui';
import { usePageMeta } from '../utils/pageMeta';
import { formatCompareIds, parseCompareIds } from '../utils/compareIds';
import { differentiateCars } from '../utils/differentiateCars';
import { DISPLAY_CURRENCY } from '../utils/currency';
import { useRegionStore } from '../stores/regionStore';
import { POPULAR_SEARCHES } from '../config/browseTaxonomy';

function isUnavailable(value: string | number): boolean {
  return value === UNAVAILABLE_LABEL;
}

interface SpecRow {
  key: string;
  label: string;
  provenanceKey?: string;
  isEstimatedRow?: boolean;
  getValue: (car: CarSpecs, dash: CarDashboard) => string | number;
  getNumeric?: (car: CarSpecs, dash: CarDashboard) => number | null;
  higherIsBetter?: boolean;
}

const ALL_SPECS: SpecRow[] = [
  { key: 'year', label: 'YEAR', getValue: (car) => car.year },
  { key: 'country', label: 'ORIGIN', getValue: (car) => car.countryOfOrigin || UNAVAILABLE_LABEL },
  { key: 'bodyStyle', label: 'TYPE', getValue: (car) => car.bodyStyle.toUpperCase() },
  {
    key: 'engine',
    label: 'ENGINE',
    getValue: (car) => {
      const label = formatEngineForDetail(car.engine);
      return label === UNAVAILABLE_LABEL ? UNAVAILABLE_LABEL : label.toUpperCase();
    },
  },
  {
    key: 'horsepower',
    label: 'POWER',
    provenanceKey: 'engine.horsepower',
    getValue: (car) => (car.engine.horsepower != null ? `${car.engine.horsepower} HP` : UNAVAILABLE_LABEL),
    getNumeric: (car) => car.engine.horsepower ?? null,
    higherIsBetter: true,
  },
  {
    key: 'safety',
    label: 'NHTSA',
    provenanceKey: 'safetyRating.overall',
    getValue: (car) =>
      car.safetyRating?.overall != null && car.safetyRating.overall > 0
        ? `${car.safetyRating.overall}/5`
        : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.safetyRating?.overall ?? null,
    higherIsBetter: true,
  },
  {
    key: 'torque',
    label: 'TORQUE',
    getValue: (car) => (car.engine.torque != null ? `${car.engine.torque} LB-FT` : UNAVAILABLE_LABEL),
    getNumeric: (car) => car.engine.torque ?? null,
    higherIsBetter: true,
  },
  { key: 'fuelType', label: 'FUEL', getValue: (car) => formatFuelTypeLabel(car.engine.fuelType).toUpperCase() },
  {
    key: 'transmission',
    label: 'TRANS',
    getValue: (car) => formatTransmissionLabel(car.transmission).toUpperCase(),
  },
  { key: 'driveType', label: 'DRIVE', getValue: (car) => car.driveType },
  {
    key: 'zeroToSixty',
    label: '0-60',
    provenanceKey: 'performance.zeroToSixty',
    getValue: (car, dash) => {
      if (dash.zeroToSixty) return `~${dash.zeroToSixty.value}s`;
      if (car.performance?.zeroToSixty) return `${car.performance.zeroToSixty.toFixed(1)}S`;
      return UNAVAILABLE_LABEL;
    },
    getNumeric: (car, dash) => dash.zeroToSixty?.value ?? car.performance?.zeroToSixty ?? null,
    higherIsBetter: false,
    isEstimatedRow: true,
  },
  {
    key: 'mpgCity',
    label: 'EFF CITY',
    provenanceKey: 'fuelEconomy.combined',
    getValue: (car) =>
      car.fuelEconomy.city
        ? `${car.fuelEconomy.city} ${usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'}`
        : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.fuelEconomy.city ?? null,
    higherIsBetter: true,
  },
  {
    key: 'mpgHighway',
    label: 'EFF HWY',
    provenanceKey: 'fuelEconomy.combined',
    getValue: (car) =>
      car.fuelEconomy.highway
        ? `${car.fuelEconomy.highway} ${usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'}`
        : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.fuelEconomy.highway ?? null,
    higherIsBetter: true,
  },
  {
    key: 'mpgCombined',
    label: 'EFF AVG',
    provenanceKey: 'fuelEconomy.combined',
    getValue: (car) =>
      car.fuelEconomy.combined
        ? `${car.fuelEconomy.combined} ${usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'}`
        : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.fuelEconomy.combined ?? null,
    higherIsBetter: true,
  },
  {
    key: 'annualFuelCost',
    label: 'EPA FUEL $/YR',
    provenanceKey: 'epa.annualFuelCost',
    getValue: (car) =>
      car.epa?.annualFuelCost != null
        ? `$${car.epa.annualFuelCost.toLocaleString()} USD (EPA)`
        : UNAVAILABLE_LABEL,
    getNumeric: (car) => car.epa?.annualFuelCost ?? null,
    higherIsBetter: false,
  },
  {
    key: 'co2',
    label: 'CO2 G/MI',
    provenanceKey: 'epa.co2',
    getValue: (car) => (car.epa?.co2 != null ? `${car.epa.co2}` : UNAVAILABLE_LABEL),
    getNumeric: (car) => car.epa?.co2 ?? null,
    higherIsBetter: false,
  },
  {
    key: 'price',
    label: `EST. VALUE (${DISPLAY_CURRENCY})`,
    provenanceKey: 'price.msrp',
    isEstimatedRow: true,
    getValue: (car, dash) => {
      const mid = dash.ownership.marketValue.mid;
      if (mid > 0) {
        return `$${Math.round(mid).toLocaleString()} ${DISPLAY_CURRENCY} (est.)`;
      }
      return car.price?.msrp
        ? `$${Math.round(car.price.msrp).toLocaleString()} ${DISPLAY_CURRENCY} (est.)`
        : UNAVAILABLE_LABEL;
    },
    getNumeric: (car, dash) => dash.ownership.marketValue.mid || car.price?.msrp || null,
    higherIsBetter: false,
  },
];

export default function Compare() {
  usePageMeta('Compare', 'Side-by-side EPA specs and labeled estimates for up to five vehicles.');
  const [searchParams, setSearchParams] = useSearchParams();
  const { comparedCars, removeCarFromComparison, clearComparison, replaceComparison } = useCarStore();
  const [dashboards, setDashboards] = useState<CarDashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [urlHydrated, setUrlHydrated] = useState(false);
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
        if (!cancelled) setLoadError('Could not load vehicles from this compare link.');
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

  if (!urlHydrated && urlHasCars) {
    return <LoadingScreen label="Loading comparison" />;
  }

  if (comparedCars.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="page-wrap py-14 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Compare</h1>
          <p className="text-sm text-zinc-400 mb-10 max-w-lg leading-relaxed">
            Add up to 5 vehicles from a dossier or search card. Start with a name you already have,
            or a situation.
          </p>
          <div className="max-w-xl">
            <div className="intent-row">
              <p className="text-sm font-semibold text-white">I have names</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {POPULAR_SEARCHES.map((s) => (
                  <Link
                    key={s.query}
                    to={`/home?${new URLSearchParams({ q: s.query, sort: 'relevance' }).toString()}`}
                    className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="intent-row">
              <p className="text-sm font-semibold text-white">I don&apos;t yet</p>
              <Link
                to="/browse"
                className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
              >
                Start from a situation →
              </Link>
            </div>
            <div className="intent-row border-b-0">
              <p className="text-sm font-semibold text-white">I want the market</p>
              <Link
                to="/value-matrix"
                className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
              >
                Open the value chart →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pairs = comparedCars.map((car) => ({
    car,
    dashboard: dashboardById.get(car.id),
  }));

  const diff = useMemo(() => differentiateCars(comparedCars), [comparedCars]);

  const specs = ALL_SPECS.filter((spec) => {
    const hasAnyData = pairs.some(({ car, dashboard }) => {
      if (!dashboard) return false;
      return !isUnavailable(spec.getValue(car, dashboard));
    });
    return hasAnyData;
  });

  const bestByRow = new Map<string, number>();
  if (pairs.length > 1 && !loading) {
    for (const spec of specs) {
      if (!spec.getNumeric) continue;
      const values = pairs
        .filter((p) => p.dashboard)
        .map((p) => spec.getNumeric!(p.car, p.dashboard!))
        .filter((v): v is number => v != null);
      if (values.length < 2) continue;
      const best = spec.higherIsBetter ? Math.max(...values) : Math.min(...values);
      const worst = spec.higherIsBetter ? Math.min(...values) : Math.max(...values);
      if (best !== worst) bestByRow.set(spec.key, best);
    }
  }

  function resolveProvenance(dashboard: CarDashboard, spec: SpecRow) {
    if (!spec.provenanceKey) return null;
    if (spec.provenanceKey === 'performance.zeroToSixty' && dashboard.zeroToSixty) {
      return dashboard.zeroToSixty.method === 'actual' ? 'curated' : 'estimated';
    }
    if (spec.provenanceKey === 'epa.annualFuelCost' || spec.provenanceKey === 'epa.co2') {
      return fieldProvenanceSource(dashboard, spec.provenanceKey) ?? 'epa';
    }
    return fieldProvenanceSource(dashboard, spec.provenanceKey);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <StatusToast message={toast} />
      <div className="border-b border-zinc-900">
        <div className="page-wrap py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Compare</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                {comparedCars.length} vehicle{comparedCars.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
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
                className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors shrink-0"
              >
                Share
              </button>
              <button
                type="button"
                onClick={clearComparison}
                className="text-xs sm:text-sm text-zinc-400 hover:text-red-400 transition-colors shrink-0"
              >
                Clear all
              </button>
            </div>
          </div>
          {loadError && <p className="text-xs text-amber-300/90 mt-3">{loadError}</p>}
          <p className="text-[10px] text-zinc-500 mt-3">
            Estimated values use your cost region ({region === 'british-columbia' ? 'B.C.' : 'Ontario'}), CAD.
            EPA fuel $/yr is a US-dollar reference from EPA tests.{' '}
            <Link to="/methodology" className="underline underline-offset-2 hover:text-zinc-300">
              Methodology
            </Link>
          </p>
        </div>
      </div>

      <div className="page-wrap py-6 sm:py-8 pb-16">
        {loading ? (
          <div className="text-center py-20" role="status">
            <div className="inline-block w-10 h-10 border-2 border-zinc-800 border-t-zinc-500 mb-3 animate-spin" />
            <p className="text-[10px] tracking-widest text-zinc-400 uppercase">Loading comparison data</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {diff.axes.length > 0 && comparedCars.length > 1 && (
              <div className="mb-8 pb-6 border-b border-zinc-800">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  How they differ
                </p>
                <ul className="space-y-2 mb-5">
                  {diff.axes.map((axis) => (
                    <li key={axis} className="text-base text-zinc-100 leading-snug">
                      {axis}
                    </li>
                  ))}
                </ul>
                <ul className="space-y-3">
                  {comparedCars.map((car) => (
                    <li key={car.id} className="text-base leading-snug">
                      <span className="text-zinc-500">
                        {car.year} {car.make} {displayModelLabel(car)} —{' '}
                      </span>
                      <span className="text-white font-medium">
                        {diff.byCarId[car.id]?.edge}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="px-2 sm:px-4 py-3 sm:py-4 text-left sticky left-0 bg-black z-10 min-w-[72px] sm:min-w-[100px]">
                      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-400">Spec</span>
                    </th>
                    {pairs.map(({ car }) => (
                      <th key={car.id} className="px-2 sm:px-4 py-3 sm:py-4 min-w-[132px] sm:min-w-[200px] border-l border-zinc-800 align-top">
                        <Link to={`/car/${car.id}`} className="block text-center group/col hover:opacity-90 transition-opacity">
                          <div className="relative h-10 sm:h-12 mb-2 border border-zinc-800 overflow-hidden mx-auto max-w-[120px]">
                            <VehiclePlaceholder car={car} compact hideCaption className="!absolute inset-0" />
                          </div>
                          <p className="text-xl sm:text-3xl font-black text-zinc-300 tabular-nums group-hover/col:text-white transition-colors">{car.year}</p>
                          <h3 className="text-sm sm:text-base font-black tracking-tight uppercase mt-1 sm:mt-2 group-hover/col:underline underline-offset-4 decoration-zinc-600">{car.make}</h3>
                          <p className="text-xs sm:text-sm font-medium text-zinc-400 break-words">{displayModelLabel(car)}</p>
                          {displayListingSubtitle(car) && (
                            <p className="text-xs text-zinc-500 mt-1">{displayListingSubtitle(car)}</p>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeCarFromComparison(car.id)}
                          className="mt-3 px-2 py-2 text-[10px] tracking-widest text-zinc-500 hover:text-red-400 transition-colors uppercase w-full"
                        >
                          Remove
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.key} className="border-b border-zinc-900">
                      <td className="px-2 sm:px-4 py-3 sticky left-0 z-10 bg-black border-r border-zinc-800">
                        <span className="text-xs tracking-widest text-zinc-400 uppercase block">{spec.label}</span>
                        {spec.isEstimatedRow && (
                          <span className="text-[10px] text-zinc-600 mt-0.5 block">est.</span>
                        )}
                      </td>
                      {pairs.map(({ car, dashboard }) => {
                        if (!dashboard) {
                          return (
                            <td key={car.id} className="px-2 sm:px-4 py-3 text-center border-l border-zinc-800 text-zinc-400 text-xs">
                              …
                            </td>
                          );
                        }
                        const best = bestByRow.get(spec.key);
                        const numeric = spec.getNumeric?.(car, dashboard) ?? null;
                        const isBest = best != null && numeric != null && numeric === best;
                        const raw = spec.getValue(car, dashboard);
                        const missing = isUnavailable(raw);
                        const prov = resolveProvenance(dashboard, spec);
                        return (
                          <td
                            key={car.id}
                            className={`px-2 sm:px-4 py-3 text-center border-l border-zinc-800 ${
                              isBest && !missing ? 'compare-win' : ''
                            }`}
                          >
                            <span
                              className={`text-sm inline-flex flex-col items-center gap-1 ${
                                missing
                                  ? 'text-zinc-400 text-xs italic'
                                  : isBest
                                    ? 'font-black text-white tabular-nums'
                                    : numeric != null
                                      ? 'font-medium tabular-nums text-white'
                                      : 'text-zinc-300'
                              }`}
                            >
                              <span>
                                {raw}
                                {isBest && !missing && (
                                  <span className="ml-1.5 text-[9px] text-emerald-400 align-middle not-italic font-bold uppercase tracking-wider bg-emerald-950/50 px-1.5 py-0.5 border border-emerald-800/40">
                                    Best
                                  </span>
                                )}
                              </span>
                              {prov === 'estimated' && !missing && (
                                <span className="text-[10px] text-zinc-600">est.</span>
                              )}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
