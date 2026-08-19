import { Link } from 'react-router-dom';
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
import {
  fieldConfidence,
  fieldProvenanceSource,
  type TrustFilter,
} from '../utils/dataTrust';
import ProvenanceChip from '../components/ProvenanceChip';
import { usePageMeta } from '../utils/pageMeta';

const FILTERS: { id: TrustFilter; label: string }[] = [
  { id: 'all', label: 'All fields' },
  { id: 'verified', label: 'Verified only' },
  { id: 'estimated', label: 'Estimates only' },
];

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
    label: 'FUEL $/YR',
    provenanceKey: 'epa.annualFuelCost',
    getValue: (car) =>
      car.epa?.annualFuelCost != null ? `$${car.epa.annualFuelCost.toLocaleString()}` : UNAVAILABLE_LABEL,
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
    label: 'EST. VALUE',
    provenanceKey: 'price.msrp',
    isEstimatedRow: true,
    getValue: (car, dash) => {
      const mid = dash.ownership.marketValue.mid;
      if (mid > 0) {
        return `$${Math.round(mid).toLocaleString()} (est.)`;
      }
      return car.price?.msrp ? `$${Math.round(car.price.msrp).toLocaleString()} (est.)` : UNAVAILABLE_LABEL;
    },
    getNumeric: (car, dash) => dash.ownership.marketValue.mid || car.price?.msrp || null,
    higherIsBetter: false,
  },
];

export default function Compare() {
  usePageMeta('Compare', 'Side-by-side EPA specs and labeled estimates for up to five vehicles.');
  const { comparedCars, removeCarFromComparison, clearComparison } = useCarStore();
  const [trustFilter, setTrustFilter] = useState<TrustFilter>('all');
  const [dashboards, setDashboards] = useState<CarDashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const comparedIds = useMemo(() => comparedCars.map((c) => c.id).join(','), [comparedCars]);

  useEffect(() => {
    if (comparedCars.length === 0) {
      setDashboards([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all(comparedCars.map((c) => api.getCarDashboard(c.id)))
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
  }, [comparedIds, comparedCars]);

  const dashboardById = useMemo(() => {
    const map = new Map<string, CarDashboard>();
    for (const d of dashboards) map.set(d.car.id, d);
    return map;
  }, [dashboards]);

  if (comparedCars.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors mb-12 group"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>BACK</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-3 uppercase">No vehicles selected</h1>
          <p className="text-sm text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
            Add up to 5 vehicles from search or browse to compare specs side by side.
          </p>
          <Link to="/home" className="btn-primary text-xs">
            Search vehicles
          </Link>
        </div>
      </div>
    );
  }

  const pairs = comparedCars.map((car) => ({
    car,
    dashboard: dashboardById.get(car.id),
  }));

  const specs = ALL_SPECS.filter((spec) => {
    const hasAnyData = pairs.some(({ car, dashboard }) => {
      if (!dashboard) return false;
      return !isUnavailable(spec.getValue(car, dashboard));
    });
    if (!hasAnyData) return false;
    if (trustFilter === 'all') return true;
    if (spec.isEstimatedRow || spec.provenanceKey === 'price.msrp') {
      return trustFilter === 'estimated';
    }
    if (spec.provenanceKey) return trustFilter === 'verified';
    return trustFilter === 'verified';
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
      <div className="border-b border-zinc-900">
        <div className="page-wrap py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Compare</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                {comparedCars.length} vehicle{comparedCars.length !== 1 ? 's' : ''} · full dossier provenance
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter compare rows">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTrustFilter(f.id)}
                    className={`px-2 py-1 text-[10px] tracking-widest uppercase border transition-colors ${
                      trustFilter === f.id
                        ? 'border-white text-white'
                        : 'border-zinc-700 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={clearComparison}
                className="text-xs sm:text-sm text-zinc-400 hover:text-red-400 transition-colors shrink-0"
              >
                Clear all
              </button>
            </div>
          </div>
          {loadError && <p className="text-xs text-amber-300/90 mt-3">{loadError}</p>}
          <p className="text-[10px] text-zinc-400 mt-3">
            Rows with no data across all vehicles are hidden.{' '}
            <Link to="/methodology" className="underline underline-offset-2 hover:text-zinc-300">
              Methodology
            </Link>
          </p>
        </div>
      </div>

      <div className="page-wrap py-6 sm:py-8 pb-16">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-2 border-zinc-800 border-t-zinc-500 mb-3" />
            <p className="text-[10px] tracking-widest text-zinc-400 uppercase">Loading comparison data</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full border-collapse min-w-[320px]">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="px-3 sm:px-4 py-4 text-left sticky left-0 bg-black z-10 min-w-[100px]">
                      <span className="text-xs uppercase tracking-widest text-zinc-400">Spec</span>
                    </th>
                    {pairs.map(({ car }) => (
                      <th key={car.id} className="px-3 sm:px-4 py-4 min-w-[180px] sm:min-w-[220px] border-l border-zinc-800">
                        <div className="text-center">
                          <p className="text-4xl font-black text-zinc-300 tabular-nums">{car.year}</p>
                          <h3 className="text-lg font-black tracking-tight uppercase mt-3">{car.make}</h3>
                          <p className="text-sm font-medium text-zinc-400">{displayModelLabel(car)}</p>
                          {/* Two columns can otherwise read identically — this is what separates them. */}
                          {displayListingSubtitle(car) && (
                            <p className="text-xs text-zinc-400 mt-1">{displayListingSubtitle(car)}</p>
                          )}
                          <button
                            onClick={() => removeCarFromComparison(car.id)}
                            className="mt-4 px-2 py-2 text-[10px] tracking-widest text-zinc-400 hover:text-red-500 transition-colors uppercase"
                          >
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.key} className="border-b border-zinc-900">
                      <td className="px-4 py-3 sticky left-0 z-10 bg-black border-r border-zinc-800">
                        <span className="text-xs tracking-widest text-zinc-400 uppercase block">{spec.label}</span>
                        {spec.isEstimatedRow && <ProvenanceChip source="estimated" className="mt-1" />}
                      </td>
                      {pairs.map(({ car, dashboard }) => {
                        if (!dashboard) {
                          return (
                            <td key={car.id} className="px-4 py-3 text-center border-l border-zinc-800 text-zinc-400 text-xs">
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
                        const confidence = spec.provenanceKey
                          ? fieldConfidence(dashboard, spec.provenanceKey)
                          : undefined;
                        return (
                          <td key={car.id} className="px-4 py-3 text-center border-l border-zinc-800">
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
                                  <span className="ml-1 text-[10px] text-emerald-500/90 align-middle not-italic font-bold">
                                    best
                                  </span>
                                )}
                              </span>
                              {prov && !missing && (
                                <span className="flex items-center gap-1">
                                  <ProvenanceChip source={prov} />
                                  {confidence && (
                                    <span className="text-[9px] text-zinc-400 uppercase tracking-wider">
                                      {confidence}
                                    </span>
                                  )}
                                </span>
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
