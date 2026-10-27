import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import { useRegionStore } from '../stores/regionStore';
import { buildKeyFigures } from '../utils/keyFigures';
import ProvenanceChip from './ProvenanceChip';
import { displayVehicleTitle } from '../utils/trimLabel';
import VehiclePlaceholder from './VehiclePlaceholder';
import CarImage from './CarImage';
import RatingStars from './RatingStars';

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

  // What it uses, how it crashed, its power: the engine is in the name's line.
  const stats = dashboard
    ? buildKeyFigures(dashboard)
        .filter((figure) => figure.id !== 'engine')
        .slice(0, 3)
    : null;

  return (
    <Link
      to={`/car/${car.id}`}
      className="group block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
    >
      {/* The car large, its name over the photo's foot. */}
      <div className="relative aspect-16/10 overflow-hidden border border-white/10 shadow-[0_50px_100px_-40px_rgb(0_0_0/0.95)]">
        <div className="absolute inset-0 transition-transform duration-[1.2s] ease-out group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          {car.photo ? (
            <CarImage car={car} sizes="(min-width: 1024px) 600px, 100vw" />
          ) : (
            <VehiclePlaceholder car={car} hideCaption />
          )}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.35)_0%,transparent_30%,transparent_55%,rgb(0_0_0/0.85)_100%)]" />
        <p className="absolute left-4 top-3.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
          A car page, at a glance
        </p>
        <div className="absolute inset-x-4 bottom-10 sm:bottom-12">
          <p className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-white leading-tight">
            {displayVehicleTitle(car)}
          </p>
        </div>
      </div>
      {/* Its figures in glass, lifted over the photo's edge. */}
      <dl className="relative -mt-7 mx-3 sm:mx-5 grid grid-cols-3 gap-px bg-white/10 border border-white/15 shadow-[0_24px_48px_-20px_rgb(0_0_0/0.9)]">
        {(stats ?? [null, null, null]).map((stat, i) => (
          <div
            key={stat?.id ?? i}
            className="bg-zinc-950/80 backdrop-blur-md px-3 py-2.5 min-h-[72px]"
          >
            {stat ? (
              <>
                <dt className="flex items-start justify-between gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  <span className="min-w-0 truncate">{stat.label}</span>
                  {stat.source && (
                    <ProvenanceChip source={stat.source} className="shrink-0 hidden sm:inline" />
                  )}
                </dt>
                <dd className="mt-1">
                  <span
                    className={`text-xl sm:text-2xl font-semibold tracking-[-0.03em] tabular-nums ${stat.missing ? 'text-zinc-400 text-base!' : 'text-white'}`}
                  >
                    {stat.value}
                  </span>
                  {stat.unit && <span className="text-[11px] text-zinc-400"> {stat.unit}</span>}
                  {stat.stars != null && (
                    <span className="block mt-0.5">
                      <RatingStars stars={stat.stars} className="w-2.5 h-2.5" />
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
      <p className="mt-3 px-3 sm:px-5 text-[13px] text-zinc-300 group-hover:text-white transition-colors">
        See the whole page{' '}
        <span
          aria-hidden
          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      </p>
    </Link>
  );
}
