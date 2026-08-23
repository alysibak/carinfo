import { Link, useParams } from 'react-router-dom';
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
import BodyTypeIllustration from '../components/BodyTypeIllustration';
import { searchQueryToParams } from '../utils/searchParams';

function homeLink(query: ReturnType<typeof presetToSearchQuery>) {
  return `/home?${searchQueryToParams(query, 1).toString()}`;
}

function filterLink(filters: Parameters<typeof presetToSearchQuery>[0]['filters']) {
  return homeLink(presetToSearchQuery({ id: '', label: '', description: '', filters }));
}

export default function Explore() {
  const { category } = useParams<{ category: string }>();
  const [stats, setStats] = useState<{ bodyStyles?: Record<string, number>; fuelTypes?: Record<string, number> }>({});

  useEffect(() => {
    api.getStatistics().then(setStats).catch(() => {});
  }, []);

  const title = (() => {
    switch (category) {
      case 'body-style': return 'Browse by type';
      case 'brand': return 'Browse by make';
      case 'purpose': return 'Browse by need';
      case 'era': return 'Browse by era';
      default: return 'Browse';
    }
  })();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <Link to="/browse" className="text-xs tracking-widest text-zinc-400 hover:text-white uppercase mb-6 inline-block">
          ← All categories
        </Link>
        <h1 className="text-3xl font-black tracking-tight mb-2">{title}</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Tap a category to open a filtered search, then refine from there.
        </p>

        {category === 'body-style' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BODY_TYPES.map((type) => (
              <Link
                key={type.id}
                to={filterLink(bodyTypeFilter(type.id))}
                className="flex items-center justify-between gap-4 p-5 border border-zinc-800 hover:border-zinc-500 transition-colors"
              >
                <BodyTypeIllustration bodyType={type.id} className="h-12 w-24 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold capitalize">{type.label}</p>
                  <p className="text-xs text-zinc-400">{type.description}</p>
                </div>
                {stats.bodyStyles?.[type.id] != null && (
                  <span className="text-xs text-zinc-400">{stats.bodyStyles[type.id].toLocaleString()}</span>
                )}
              </Link>
            ))}
          </div>
        )}

        {category === 'brand' && (
          <div className="flex flex-wrap gap-2">
            {TOP_MAKES.map((make) => (
              <Link
                key={make}
                to={filterLink(makeFilter(make))}
                className="px-4 py-2 border border-zinc-800 text-sm text-zinc-300 hover:border-white hover:text-white transition-colors"
              >
                {make}
              </Link>
            ))}
          </div>
        )}

        {category === 'purpose' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LIFESTYLE_PRESETS.map((preset) => (
              <Link
                key={preset.id}
                to={homeLink(presetToSearchQuery(preset))}
                className="p-5 border border-zinc-800 hover:border-zinc-500 transition-colors"
              >
                <p className="font-bold mb-1">{preset.label}</p>
                <p className="text-xs text-zinc-400">{preset.description}</p>
              </Link>
            ))}
          </div>
        )}

        {category === 'era' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {YEAR_BUCKETS.map((bucket) => (
              <Link
                key={bucket.id}
                to={filterLink(bucket.filters)}
                className="p-5 border border-zinc-800 hover:border-zinc-500 transition-colors"
              >
                <p className="font-bold">{bucket.label}</p>
                {bucket.description && <p className="text-xs text-zinc-400">{bucket.description}</p>}
              </Link>
            ))}
          </div>
        )}

        {category === 'fuel' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FUEL_TYPES.map((fuel) => (
              <Link
                key={fuel.id}
                to={filterLink(fuelTypeFilter(fuel.id))}
                className="p-5 border border-zinc-800 hover:border-zinc-500 transition-colors"
              >
                <p className="font-bold capitalize">{fuel.label}</p>
                <p className="text-xs text-zinc-400">
                  {stats.fuelTypes?.[fuel.id] != null
                    ? `${stats.fuelTypes[fuel.id].toLocaleString()} vehicles`
                    : fuel.description}
                </p>
              </Link>
            ))}
          </div>
        )}

        {category === 'budget' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRICE_BUCKETS.map((bucket) => (
              <Link
                key={bucket.id}
                to={filterLink(bucket.filters)}
                className="p-5 border border-zinc-800 hover:border-zinc-500 transition-colors"
              >
                <p className="font-bold">{bucket.label}</p>
                {bucket.description && <p className="text-xs text-zinc-400">{bucket.description}</p>}
              </Link>
            ))}
          </div>
        )}

        {!['body-style', 'brand', 'purpose', 'era', 'fuel', 'budget'].includes(category ?? '') && (
          <Link to="/browse" className="text-sm text-zinc-400 hover:text-white underline underline-offset-4">
            View all browse categories
          </Link>
        )}
      </div>
    </div>
  );
}
