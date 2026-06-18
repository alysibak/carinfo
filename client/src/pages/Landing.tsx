import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PersonaQuiz, { PersonaResult } from '../components/PersonaQuiz';
import AboutData from '../components/AboutData';
import SearchBar from '../components/SearchBar';
import SiteHeader from '../components/SiteHeader';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import * as api from '../services/api';
import type { CarFilter, CarSpecs, SearchQuery } from '../types/car.types';
import { COLLECTIONS } from '../config/collections';
import {
  LIFESTYLE_PRESETS,
  presetToSearchQuery,
  filtersToSearchQuery,
} from '../config/browseTaxonomy';
import { searchQueryToParams } from '../utils/searchParams';
import { formatPriceShort, formatEngineDetailForCard, formatMpgForCard, formatPowerForCard } from '../utils/dataValue';
import { formatFuelBadge, usesMpge } from '../utils/fuelDisplay';

interface QuickChip {
  label: string;
  filters: CarFilter;
  sort?: SearchQuery['sort'];
}

const QUICK_CHIPS: QuickChip[] = [
  {
    label: 'Electric',
    filters: { fuelType: ['electric', 'hybrid', 'plug-in hybrid'] },
    sort: { field: 'year', order: 'desc' },
  },
  { label: 'SUV', filters: { bodyStyle: ['suv'] } },
  {
    label: 'Under $20k',
    filters: { price: { max: 20000 } },
    sort: { field: 'price', order: 'asc' },
  },
  {
    label: '40+ MPG',
    filters: { fuelEconomy: { min: 40 } },
    sort: { field: 'fuelEconomy', order: 'desc' },
  },
];

const TOOLS = [
  {
    to: '/home',
    title: 'Search',
    desc: '28k+ vehicles with filters',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    to: '/value-matrix',
    title: 'Value Matrix',
    desc: 'Plot price vs efficiency',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 19h16M4 15l4-6 4 3 4-7 4 10" />
      </svg>
    ),
  },
  {
    to: '/vin',
    title: 'VIN Decoder',
    desc: 'Decode any 17-digit VIN',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/compare',
    title: 'Compare',
    desc: 'Side-by-side spec sheets',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: '1', title: 'Search or browse', desc: 'Find by make, model, year, budget, or body style.' },
  { n: '2', title: 'Compare specs', desc: 'Fuel economy, safety, power, and estimated value in CAD.' },
  { n: '3', title: 'Save to garage', desc: 'Build a shortlist and share it with a link.' },
];

export default function Landing() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [stats, setStats] = useState<{
    totalCars: number;
    totalMakes: number;
    yearRange: { min: number; max: number };
  } | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
  const [heroQuery, setHeroQuery] = useState('');
  const [featured, setFeatured] = useState<CarSpecs | null>(null);
  const navigate = useNavigate();

  const handleHeroSearch = (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) {
      params.set('q', q.trim());
      params.set('sort', 'relevance');
    }
    navigate(`/home?${params.toString()}`);
  };

  const handleQuizComplete = (persona: PersonaResult) => {
    setShowQuiz(false);
    const params = new URLSearchParams({
      persona: persona.type,
      minPrice: persona.budget.min.toString(),
      maxPrice: persona.budget.max.toString(),
      priority: persona.priority,
      usage: persona.usage,
    });
    navigate(`/smart-search?${params.toString()}`);
  };

  useEffect(() => {
    api
      .getStatistics()
      .then((data) => {
        if (data?.totalCars) {
          setStats({
            totalCars: data.totalCars,
            totalMakes: data.totalMakes,
            yearRange: data.yearRange,
          });
        }
      })
      .catch(() => {});

    api
      .searchCars({
        filters: { bodyStyle: ['suv'], fuelEconomy: { min: 26 }, year: { min: 2021 } },
        sort: { field: 'fuelEconomy', order: 'desc' },
        limit: 30,
        offset: 0,
      })
      .then((res) => {
        const populated = res.results.filter(
          (c) => (c.price?.msrp ?? 0) > 0 && (c.fuelEconomy?.combined ?? 0) > 0,
        );
        const pool = (populated.length ? populated : res.results).slice(0, 10);
        if (pool.length) setFeatured(pool[Math.floor(Math.random() * pool.length)]);
      })
      .catch(() => {});

    Promise.all(
      Object.values(COLLECTIONS).map(async (c) => {
        try {
          const res = await api.searchCars({ ...c.query, limit: 1, offset: 0 });
          return [c.id, res.total] as const;
        } catch {
          return [c.id, -1] as const;
        }
      }),
    ).then((entries) => {
      setCollectionCounts(Object.fromEntries(entries.filter(([, n]) => n >= 0)));
    });
  }, []);

  const vehicles = stats ? stats.totalCars.toLocaleString() : '28,000+';
  const makes = stats ? String(stats.totalMakes) : '89';
  const years = stats ? `${stats.yearRange.min}–${stats.yearRange.max}` : '1995–2026';

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      {showQuiz && <PersonaQuiz onComplete={handleQuizComplete} />}

      <SiteHeader
        transparentUntilScroll
        trailing={
          <button
            type="button"
            onClick={() => setShowQuiz(true)}
            className="btn-primary !py-2 !px-3 sm:!px-4 !text-sm"
          >
            <span className="hidden sm:inline">Find my car</span>
            <span className="sm:hidden">Quiz</span>
          </button>
        }
      />

      <section className="relative mesh-hero overflow-hidden">
        <div className="page-wrap pt-8 pb-12 md:pt-14 md:pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 xl:gap-16 items-end">
            <div className="max-w-xl">
              <p className="kicker">EPA & NHTSA data</p>

              <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-semibold text-white tracking-tight leading-[1.05] mt-3 mb-4">
                Search and compare cars
              </h1>

              <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-md">
                {vehicles} vehicles from {makes} brands, {years}. Specs, fuel economy, safety
                ratings, and estimated prices in one place.
              </p>

              <div className="mt-8 max-w-lg">
                <SearchBar
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={handleHeroSearch}
                  size="large"
                  placeholder="Make, model, or year"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => (
                    <Link
                      key={chip.label}
                      to={`/home?${searchQueryToParams(
                        filtersToSearchQuery(chip.filters, chip.sort),
                        1,
                      ).toString()}`}
                      className="chip"
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-6 border-t border-zinc-900 pt-6 sm:pt-8">
                <Stat value={vehicles} label="Vehicles" />
                <Stat value={makes} label="Brands" />
                <Stat value={years} label="Years" />
              </div>
            </div>

            <div className="relative pb-2">
              {featured ? (
                <FeaturedCard car={featured} />
              ) : (
                <div className="surface-card animate-pulse">
                  <div className="aspect-[16/10] lg:aspect-[4/5] bg-zinc-950" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader title="Tools" subtitle="Everything you need to research a purchase." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {TOOLS.map((tool) => (
            <Link key={tool.to} to={tool.to} className="tool-card group">
              <span className="text-zinc-500 group-hover:text-white transition-colors">{tool.icon}</span>
              <p className="text-base font-semibold text-white tracking-tight">{tool.title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader title="How it works" />
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((step) => (
            <div key={step.n} className="step-card">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-zinc-700 text-xs font-semibold text-zinc-400 mb-3">
                {step.n}
              </span>
              <p className="text-base font-semibold text-white tracking-tight">{step.title}</p>
              <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <AboutData />
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader index="01" title="Shop by use" subtitle="Start with how you'll drive it." />
        <div className="border-y border-zinc-900">
          {LIFESTYLE_PRESETS.map((preset, i) => (
            <Link
              key={preset.id}
              to={`/home?${searchQueryToParams(presetToSearchQuery(preset), 1).toString()}`}
              className="list-row group"
            >
              <div className="flex items-baseline gap-4 sm:gap-5 min-w-0">
                <span className="text-xs text-zinc-600 font-tabular w-6 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-semibold text-white tracking-tight group-hover:text-zinc-300 transition-colors">
                    {preset.label}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5 sm:mt-1 line-clamp-2">{preset.description}</p>
                </div>
              </div>
              <span className="text-zinc-600 group-hover:text-white transition-colors shrink-0">→</span>
            </Link>
          ))}
        </div>
        <Link to="/browse" className="inline-block mt-6 text-sm text-zinc-500 hover:text-white transition-colors">
          Browse all →
        </Link>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader index="02" title="Browse" />
        <div className="grid sm:grid-cols-2 gap-px bg-zinc-900 border border-zinc-900">
          {[
            { to: '/explore/purpose', title: 'By need', desc: 'Commute, family, work' },
            { to: '/explore/body-style', title: 'By body style', desc: 'Sedan, SUV, coupe' },
            { to: '/explore/budget', title: 'By budget', desc: '$15k through $60k+' },
            { to: '/explore/era', title: 'By year', desc: '2020s to classics' },
          ].map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group bg-black p-6 sm:p-8 md:p-10 transition-colors hover:bg-zinc-950"
            >
              <p className="kicker mb-2 sm:mb-3">{card.desc}</p>
              <p className="text-xl sm:text-2xl font-semibold text-white tracking-tight group-hover:text-zinc-300 transition-colors">
                {card.title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader
          index="03"
          title="Collections"
          subtitle="Hand-picked lists for common searches."
        />
        <div>
          {Object.values(COLLECTIONS).map((c) => (
            <Link
              key={c.id}
              to={`/collection/${c.id}`}
              className="list-row group"
            >
              <div className="min-w-0 pr-4">
                <p className="text-base sm:text-lg md:text-xl font-semibold text-white tracking-tight group-hover:text-zinc-300 transition-colors">
                  {c.title}
                </p>
                <p className="text-sm text-zinc-500 mt-0.5 sm:mt-1 line-clamp-2">{c.subtitle}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-zinc-500 whitespace-nowrap">
                  {collectionCounts[c.id] != null
                    ? `${collectionCounts[c.id].toLocaleString()} vehicles`
                    : 'View'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-900">
        <div className="page-wrap py-10 sm:py-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-white">CarInfo</p>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs leading-relaxed">
              EPA fuel economy, NHTSA safety data, and estimated values in CAD.
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} CarInfo
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeaturedCard({ car }: { car: CarSpecs }) {
  const mpgLabel = usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
  const combined = car.fuelEconomy?.combined ?? 0;
  const mpgValue = formatMpgForCard(car.fuelEconomy?.combined);
  const mpgPct = Math.max(6, Math.min(100, (combined / 60) * 100));
  const priceValue = formatPriceShort(car.price?.msrp, car.price?.isEstimated);
  const engineValue = formatEngineDetailForCard(car.engine);
  const powerValue = formatPowerForCard(car.engine.horsepower);
  const overall = car.safetyRating?.overall;

  return (
    <div className="surface-card animate-fade-in overflow-hidden">
      <Link to={`/car/${car.id}`} className="block group">
        <div className="relative aspect-[16/10] lg:aspect-[4/5] lg:max-h-[520px]">
          <VehiclePlaceholder car={car} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <p className="kicker mb-1 sm:mb-2">Featured</p>
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-none">{car.year}</p>
            <h3 className="text-lg sm:text-xl font-semibold text-white mt-1 tracking-tight">
              {car.make} {car.model}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2 sm:mt-3 text-xs text-zinc-400">
              <span>{car.bodyStyle}</span>
              <span className="text-zinc-700">·</span>
              <span>{formatFuelBadge(car.engine.fuelType)}</span>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-zinc-900 grid grid-cols-2 gap-4 sm:gap-5">
          <div>
            <dt className="kicker">Power</dt>
            <dd className="mt-1 text-lg sm:text-xl font-semibold text-white tracking-tight">{powerValue}</dd>
          </div>
          <div>
            <dt className="kicker">{mpgLabel}</dt>
            <dd className="mt-1 text-lg sm:text-xl font-semibold text-white tracking-tight">{mpgValue}</dd>
            <div className="meter-track mt-2">
              <div className="meter-fill" style={{ width: `${mpgPct}%` }} />
            </div>
          </div>
          <div className="col-span-2 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-zinc-500 border-t border-zinc-900">
            <span>{car.driveType} · {engineValue}</span>
            <span>{overall ? `${overall}/5 NHTSA` : 'Safety unrated'}</span>
          </div>
          <p className="col-span-2 text-xs text-zinc-500">
            Est. {priceValue} CAD
          </p>
        </div>
      </Link>
    </div>
  );
}

function SectionHeader({
  index,
  title,
  subtitle,
}: {
  index?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 sm:mb-8 md:mb-10 flex flex-col gap-1.5 sm:gap-2">
      {index && <span className="kicker">{index}</span>}
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="text-sm text-zinc-500 max-w-md">{subtitle}</p>}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none">{value}</p>
      <p className="text-xs text-zinc-500 mt-1.5 sm:mt-2">{label}</p>
    </div>
  );
}
