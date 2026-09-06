import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
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
  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="page-wrap pt-10 pb-4">
        <PageHeader
          title="Start from a situation"
          subtitle="People rarely shop the whole archive. They shop a use, a shape, or a budget."
        />
      </div>

      <section className="page-wrap pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
          {LIFESTYLE_PRESETS.map((preset) => (
            <Link key={preset.id} to={homeLink(presetToSearchQuery(preset))} className="list-row group">
              <div className="min-w-0">
                <p className="font-semibold text-white group-hover:text-zinc-200">{preset.label}</p>
                <p className="text-sm text-zinc-500 mt-0.5">{preset.description}</p>
              </div>
              <span className="text-zinc-600 group-hover:text-zinc-400 text-sm shrink-0">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap py-14">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">Or a body style</h2>
          <p className="text-sm text-zinc-500 mb-8">What the vehicle is, before the badge.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800">
            {BODY_TYPES.map((type) => (
              <Link
                key={type.id}
                to={filterLink(bodyTypeFilter(type.id))}
                className="bg-black p-5 hover:bg-zinc-950 transition-colors group flex flex-col"
              >
                <BodyTypeIllustration
                  bodyType={type.id}
                  className="h-14 w-full mb-3 group-hover:opacity-100 transition-opacity"
                />
                <p className="font-semibold text-white capitalize">{type.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{type.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap py-14 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A budget</h2>
            <p className="text-sm text-zinc-500 mb-6">Estimated CAD value, not asking price.</p>
            <div className="flex flex-col">
              {PRICE_BUCKETS.map((bucket) => (
                <Link key={bucket.id} to={filterLink(bucket.filters)} className="list-row text-sm text-zinc-300 hover:text-white">
                  {bucket.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A model year</h2>
            <p className="text-sm text-zinc-500 mb-6">Current gen, last decade, or older.</p>
            <div className="flex flex-col">
              {YEAR_BUCKETS.map((bucket) => (
                <Link key={bucket.id} to={filterLink(bucket.filters)} className="list-row text-sm text-zinc-300 hover:text-white">
                  {bucket.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap py-14">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">A manufacturer</h2>
          <p className="text-sm text-zinc-500 mb-6">If you already know the badge.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {TOP_MAKES.map((make) => (
              <Link
                key={make}
                to={filterLink(makeFilter(make))}
                className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-800 hover:decoration-zinc-500"
              >
                {make}
              </Link>
            ))}
          </div>

          <div className="mt-12">
            <h3 className="text-sm font-semibold text-white mb-4">Powertrain</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {FUEL_TYPES.map((fuel) => (
                <Link
                  key={fuel.id}
                  to={filterLink(fuelTypeFilter(fuel.id))}
                  className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-800 hover:decoration-zinc-500"
                >
                  {fuel.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="page-wrap py-14">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">Curated shortlists</h2>
          <p className="text-sm text-zinc-500 mb-6">Ranked picks for common situations.</p>
          {Object.values(COLLECTIONS).map((c) => (
            <Link key={c.id} to={`/collection/${c.id}`} className="list-row group">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-semibold text-white">{c.title}</p>
                <p className="text-sm text-zinc-500">{c.subtitle}</p>
              </div>
              <span className="text-zinc-600 text-sm shrink-0">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
