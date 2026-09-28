import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  BODY_TYPES,
  FUEL_TYPES,
  CLASS_LINKS,
  LIFESTYLE_PRESETS,
  PRICE_BUCKETS,
  TOP_MAKES,
  YEAR_BUCKETS,
  presetToSearchQuery,
  bodyTypeFilter,
  fuelTypeFilter,
  makeFilter,
} from '../config/browseTaxonomy';
import ShortlistCards from '../components/ShortlistCards';
import BodyTypeIllustration from '../components/BodyTypeIllustration';
import { searchQueryToParams } from '../utils/searchParams';

function homeLink(query: ReturnType<typeof presetToSearchQuery>) {
  return `/home?${searchQueryToParams(query, 1).toString()}`;
}

function filterLink(filters: Parameters<typeof presetToSearchQuery>[0]['filters']) {
  return homeLink(presetToSearchQuery({ id: '', label: '', description: '', filters }));
}

export default function Browse() {
  return (
    <div className="bg-black text-white pb-12 sm:pb-16">
      <div className="page-wrap pt-8 sm:pt-10 pb-4">
        <PageHeader
          title="Browse"
          subtitle="Start from a situation, a shape, a budget or a badge. People rarely shop the whole archive."
        />
      </div>

      <section className="page-wrap pb-10 sm:pb-12">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4">A situation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LIFESTYLE_PRESETS.map((preset) => (
            <Link
              key={preset.id}
              to={homeLink(presetToSearchQuery(preset))}
              className="choice-tile group"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-white">{preset.label}</span>
                <span className="block text-[13px] text-zinc-400 mt-0.5">{preset.description}</span>
              </span>
              <span className="text-zinc-500 group-hover:text-white shrink-0" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap section-y">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A body style</h2>
          <p className="text-sm text-zinc-500 mb-6 md:mb-8">
            What the vehicle is, before the badge.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800">
            {BODY_TYPES.map((type) => (
              <Link
                key={type.id}
                to={filterLink(bodyTypeFilter(type.id))}
                className="bg-black p-4 sm:p-5 hover:bg-zinc-950 transition-colors group flex flex-col min-w-0"
              >
                <BodyTypeIllustration
                  bodyType={type.id}
                  className="h-12 sm:h-14 w-full mb-3 group-hover:opacity-100 transition-opacity"
                />
                <p className="font-semibold text-white capitalize">{type.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{type.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap section-y">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A class</h2>
          <p className="text-sm text-zinc-500 mb-6">
            The rivals shoppers compare: a Camry against an Accord, not a Civic.
          </p>
          <div className="flex flex-wrap gap-2">
            {CLASS_LINKS.map((item) => (
              <Link
                key={item.query}
                to={`/home?${new URLSearchParams({ q: item.query }).toString()}`}
                className="chip"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap section-y grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A budget</h2>
            <p className="text-sm text-zinc-500 mb-6">Estimated CAD value, not asking price.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRICE_BUCKETS.map((bucket) => (
                <Link key={bucket.id} to={filterLink(bucket.filters)} className="choice-tile">
                  <span className="text-[15px] text-white tabular-nums">{bucket.label}</span>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A model year</h2>
            <p className="text-sm text-zinc-500 mb-6">Current gen, last decade, or older.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {YEAR_BUCKETS.map((bucket) => (
                <Link key={bucket.id} to={filterLink(bucket.filters)} className="choice-tile">
                  <span className="text-[15px] text-white tabular-nums">{bucket.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap section-y">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A manufacturer</h2>
          <p className="text-sm text-zinc-500 mb-6">If you already know the badge.</p>
          <div className="flex flex-wrap gap-2">
            {TOP_MAKES.map((make) => (
              <Link key={make} to={filterLink(makeFilter(make))} className="chip">
                {make}
              </Link>
            ))}
          </div>

          <div className="mt-10">
            <h3 className="text-base font-semibold text-white mb-3">Powertrain</h3>
            <div className="flex flex-wrap gap-2">
              {FUEL_TYPES.map((fuel) => (
                <Link key={fuel.id} to={filterLink(fuelTypeFilter(fuel.id))} className="chip">
                  {fuel.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap section-y">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">Curated shortlists</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Ranked picks for common situations, one per model.
          </p>
          <ShortlistCards />
        </div>
      </section>
    </div>
  );
}
