import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { useRegionStore } from '../stores/regionStore';
import { buildKeyFigures } from '../utils/keyFigures';
import ProvenanceChip from './ProvenanceChip';
import { displayVehicleTitle } from '../utils/trimLabel';
import VehiclePlaceholder from './VehiclePlaceholder';

/**
 * A real car's page in miniature, for the home page: the figures every car
 * page leads with, what EPA and NHTSA recorded, each with its source. It
 * replaced a large grey drawing of the same car, which showed a shape and said
 * nothing about what the site does.
 */
export default function SampleCarCard({ car }: { car: CarSpecs }) {
  const region = useRegionStore((s) => s.region);
  const [dashboard, setDashboard] = useState<CarDashboard | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getCarDashboard(car.id, region)
      .then((d) => {
        if (active) setDashboard(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [car.id, region]);

  const stats = dashboard ? buildKeyFigures(dashboard).slice(0, 4) : null;

  return (
    <Link
      to={`/car/${car.id}`}
      className="group block border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm hover:border-zinc-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="w-16 h-10 shrink-0 overflow-hidden" aria-hidden>
          <VehiclePlaceholder car={car} compact hideCaption />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">A car page, at a glance</p>
          <p className="text-base font-semibold text-white truncate">{displayVehicleTitle(car)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-zinc-800 border-y border-zinc-800 mt-4">
        {(stats ?? [null, null, null, null]).map((stat, i) => (
          <div key={stat?.id ?? i} className="bg-zinc-950 px-4 py-3 min-h-[76px]">
            {stat ? (
              <>
                <dt className="text-xs text-zinc-400 flex items-start justify-between gap-2">
                  <span className="min-w-0">{stat.label}</span>
                  {stat.source && <ProvenanceChip source={stat.source} className="shrink-0" />}
                </dt>
                <dd className="mt-0.5">
                  <span
                    className={`text-lg font-bold tabular-nums ${stat.missing ? 'text-zinc-400' : 'text-white'}`}
                  >
                    {stat.value}
                  </span>
                  {stat.unit && <span className="text-xs text-zinc-400"> {stat.unit}</span>}
                  {stat.comparison && stat.comparison.tone !== 'neutral' && (
                    <span
                      className={`block text-xs mt-0.5 ${stat.comparison.tone === 'better' ? 'text-accent' : 'text-amber-300'}`}
                    >
                      {stat.comparison.text}
                    </span>
                  )}
                </dd>
              </>
            ) : (
              <div className="h-full bg-zinc-900/60" aria-hidden />
            )}
          </div>
        ))}
      </dl>
      <p className="px-4 py-3 text-[13px] text-zinc-300 group-hover:text-white transition-colors">
        See the whole page →
      </p>
    </Link>
  );
}
