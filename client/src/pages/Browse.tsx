import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import {
  BODY_TYPES,
  FUEL_TYPES,
  LIFESTYLE_PRESETS,
  PRICE_BUCKETS,
  TOP_MAKES,
  YEAR_BUCKETS,
  presetToSearchQuery,
  bodyTypeFilter,
  fuelTypeFilter,
  makeFilter,
} from '../config/browseTaxonomy';
import { COLLECTIONS } from '../config/collections';
import BodyTypeIllustration from '../components/BodyTypeIllustration';
import { searchQueryToParams } from '../utils/searchParams';

function homeLink(query: ReturnType<typeof presetToSearchQuery>) {
  return `/home?${searchQueryToParams(query, 1).toString()}`;
}

function filterLink(filters: Parameters<typeof presetToSearchQuery>[0]['filters']) {
  return homeLink(presetToSearchQuery({ id: '', label: '', description: '', filters }));
}

export default function Browse() {
  const [stats, setStats] = useState<{
    bodyStyles?: Record<string, number>;
    fuelTypes?: Record<string, number>;
    totalCars?: number;
  } | null>(null);

  useEffect(() => {
    api.getStatistics().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      <div className="page-wrap py-10">
        <PageHeader
          title="Browse the archive"
          subtitle="Start with how you'll use the car. Every category opens a filtered search you can refine."
          backTo="/"
          backLabel="Home"
        />

        {/* Shop by need */}
        <section className="mb-12">
          <h2 className="section-heading mb-4">Shop by need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LIFESTYLE_PRESETS.map((preset) => (
              <Link
                key={preset.id}
                to={homeLink(presetToSearchQuery(preset))}
                className="surface-card-hover p-5 group rounded-none"
              >
                <p className="font-black text-white mb-1 group-hover:underline underline-offset-4">
                  {preset.label}
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">{preset.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Price & year */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          <section>
            <h2 className="text-xs font-bold tracking-[0.25em] text-zinc-300 uppercase mb-4">
              By budget
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRICE_BUCKETS.map((bucket) => (
                <Link
                  key={bucket.id}
                  to={filterLink(bucket.filters)}
                  className="px-4 py-2 border border-zinc-700 text-sm text-zinc-300 hover:border-white hover:text-white transition-colors"
                >
                  {bucket.label}
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-xs font-bold tracking-[0.25em] text-zinc-300 uppercase mb-4">
              By era
            </h2>
            <div className="flex flex-wrap gap-2">
              {YEAR_BUCKETS.map((bucket) => (
                <Link
                  key={bucket.id}
                  to={filterLink(bucket.filters)}
                  className="px-4 py-2 border border-zinc-700 text-sm text-zinc-300 hover:border-white hover:text-white transition-colors"
                >
                  {bucket.label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Body type */}
        <section className="mb-12">
          <h2 className="text-xs font-bold tracking-[0.25em] text-zinc-300 uppercase mb-4">
            By vehicle type
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800">
            {BODY_TYPES.map((type) => (
              <Link
                key={type.id}
                to={filterLink(bodyTypeFilter(type.id))}
                className="bg-zinc-950 p-5 hover:bg-zinc-900 transition-colors group flex flex-col"
              >
                <BodyTypeIllustration
                  bodyType={type.id}
                  className="h-14 w-full mb-3 group-hover:opacity-100 transition-opacity"
                />
                <p className="font-bold text-white capitalize mb-0.5">{type.label}</p>
                <p className="text-xs text-zinc-400 mb-2">{type.description}</p>
                {stats?.bodyStyles?.[type.id] != null && (
                  <p className="text-[10px] tracking-widest text-zinc-400 uppercase">
                    {stats.bodyStyles[type.id].toLocaleString()} vehicles
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Fuel */}
        <section className="mb-12">
          <h2 className="text-xs font-bold tracking-[0.25em] text-zinc-300 uppercase mb-4">
            By powertrain
          </h2>
          <div className="flex flex-wrap gap-2">
            {FUEL_TYPES.map((fuel) => (
              <Link
                key={fuel.id}
                to={filterLink(fuelTypeFilter(fuel.id))}
                className="px-4 py-3 border border-zinc-800 bg-zinc-950 hover:border-zinc-500 transition-colors min-w-[140px]"
              >
                <p className="text-sm font-semibold capitalize">{fuel.label}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {stats?.fuelTypes?.[fuel.id] != null
                    ? `${stats.fuelTypes[fuel.id].toLocaleString()} in archive`
                    : fuel.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Top makes */}
        <section className="mb-12">
          <h2 className="text-xs font-bold tracking-[0.25em] text-zinc-300 uppercase mb-4">
            By manufacturer
          </h2>
          <div className="flex flex-wrap gap-2">
            {TOP_MAKES.map((make) => (
              <Link
                key={make}
                to={filterLink(makeFilter(make))}
                className="px-3 py-1.5 text-xs border border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors"
              >
                {make}
              </Link>
            ))}
          </div>
        </section>

        {/* Curated collections */}
        <section>
          <h2 className="text-xs font-bold tracking-[0.25em] text-zinc-300 uppercase mb-4">
            Curated collections
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(COLLECTIONS).map((c) => (
              <Link
                key={c.id}
                to={`/collection/${c.id}`}
                className="p-5 border border-zinc-900 hover:border-zinc-600 transition-colors"
              >
                <p className="text-sm font-black tracking-wide mb-1">{c.title}</p>
                <p className="text-xs text-zinc-400">{c.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
