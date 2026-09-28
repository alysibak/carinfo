import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FIRST_MODEL_YEAR, LATEST_MODEL_YEAR } from '@carinfo/config/model-years';
import * as api from '../services/api';
import type { DatabaseStatistics } from '../services/api';

/**
 * A count from the stats endpoint, or the rounded stand-in when the response
 * lacks it. A browser can hold a response from before a field existed: the
 * model count arrived in one deploy, cached copies without it crashed the
 * home page on `undefined.toLocaleString()`.
 */
function countOr(value: unknown, fallback: string): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-CA')
    : fallback;
}

function yearOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * What is on file, from the live counts (GET /cars/stats/overview), so the
 * numbers move with the data rather than going stale in the copy. The big
 * number is labelled for what it counts: EPA lists each engine, gearbox and
 * drive of a model year separately, so 35,000 "cars" would promise more than
 * the 1,000-odd models a shopper thinks of as cars.
 *
 * Rounded figures hold the space until the counts arrive, so nothing below
 * moves when they do.
 */
export default function CatalogueStats({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<DatabaseStatistics | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getStatistics()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const figures = [
    { value: countOr(stats?.totalCars, '35,000+'), label: 'versions EPA tested' },
    { value: countOr(stats?.totalModels, '1,000+'), label: 'models' },
    { value: countOr(stats?.totalMakes, '90+'), label: 'makes' },
    {
      value: `${yearOr(stats?.yearRange?.min, FIRST_MODEL_YEAR)}–${yearOr(stats?.yearRange?.max, LATEST_MODEL_YEAR)}`,
      label: 'model years',
    },
  ];

  return (
    <div className={className}>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
        {figures.map((figure) => (
          // The term comes first, as a list needs; the figure shows on top.
          <div key={figure.label} className="min-w-0 flex flex-col-reverse">
            <dt className="text-xs text-zinc-400 mt-0.5">{figure.label}</dt>
            <dd className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-white leading-tight">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>
      <Link
        to="/home?filters=open"
        className="inline-flex items-center min-h-[44px] mt-2 text-sm font-medium text-accent hover:text-accent-hover"
      >
        Filter them by type, year, fuel use, safety or power →
      </Link>
    </div>
  );
}
