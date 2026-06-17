import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PersonaQuiz, { PersonaResult } from '../components/PersonaQuiz';
import AboutData from '../components/AboutData';
import SearchBar from '../components/SearchBar';
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
    label: 'Electric & hybrid',
    filters: { fuelType: ['electric', 'hybrid', 'plug-in hybrid'] },
    sort: { field: 'year', order: 'desc' },
  },
  { label: 'SUVs', filters: { bodyStyle: ['suv'] } },
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
  { label: 'Trucks', filters: { bodyStyle: ['truck'] } },
];

export default function Landing() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const browseCards = [
    { to: '/explore/purpose', title: 'By need', desc: 'Daily driver, family, commute, work', icon: <IconCompass /> },
    { to: '/explore/body-style', title: 'By type', desc: 'Sedan, SUV, truck, coupe…', icon: <IconCar /> },
    { to: '/explore/budget', title: 'By budget', desc: 'Under $15k through $60k+', icon: <IconTag /> },
    { to: '/explore/era', title: 'By era', desc: '2020s, 2010s, classics', icon: <IconCalendar /> },
  ];

  const vehicles = stats ? stats.totalCars.toLocaleString() : '28,000+';
  const makes = stats ? String(stats.totalMakes) : '89';
  const years = stats ? `${stats.yearRange.min}–${stats.yearRange.max}` : '1995–2026';

  return (
    <div className="min-h-screen bg-black text-white">
      {showQuiz && <PersonaQuiz onComplete={handleQuizComplete} />}

      {/* Top nav */}
      <header
        className={`sticky top-0 z-40 transition-colors duration-300 ${
          scrolled
            ? 'border-b border-zinc-800/80 bg-black/70 backdrop-blur-xl'
            : 'border-b border-transparent'
        }`}
      >
        <div className="page-wrap py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-md border border-zinc-700 text-zinc-300">
              <IconGauge />
            </span>
            <span className="text-base font-semibold tracking-tight text-white">CarInfo</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
            <Link className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors" to="/browse">Browse</Link>
            <Link className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors" to="/home">Search</Link>
            <Link className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors" to="/value-matrix">Matrix</Link>
            <Link className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors" to="/garage">Garage</Link>
          </nav>
          <button type="button" onClick={() => setShowQuiz(true)} className="btn-primary !py-2">
            Find my car
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mesh-hero border-b border-zinc-900 overflow-hidden">
        <div className="relative page-wrap py-14 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
            {/* Left column */}
            <div>
              <p className="eyebrow-pill">
                EPA-verified specs · Ontario price estimates in CAD
              </p>

              <h1 className="font-display text-[2.5rem] md:text-[3.25rem] xl:text-[3.75rem] text-white leading-[1.08] mt-5 mb-5 max-w-[16ch]">
                Compare cars with data you can trust
              </h1>

              <p className="text-base md:text-[1.0625rem] text-zinc-400 leading-relaxed mb-8 max-w-lg">
                Search {vehicles} vehicles from {years}. Fuel economy, safety ratings, and
                estimated value — sourced from EPA and NHTSA where available.
              </p>

              <div className="max-w-xl">
                <SearchBar
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={handleHeroSearch}
                  size="large"
                />
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-600 mr-1">Try:</span>
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

              <div className="flex flex-wrap gap-3 mt-8">
                <button type="button" onClick={() => setShowQuiz(true)} className="btn-primary">
                  Find my car
                </button>
                <Link to="/browse" className="btn-secondary">Browse categories</Link>
                <Link to="/value-matrix" className="btn-secondary">Value matrix</Link>
              </div>

              {/* Stat band */}
              <div className="mt-10 flex items-center gap-4 sm:gap-8 border-t border-zinc-900 pt-6">
                <Stat value={vehicles} label="Vehicles" />
                <span className="h-10 w-px bg-zinc-800" />
                <Stat value={makes} label="Makes" />
                <span className="h-10 w-px bg-zinc-800" />
                <Stat value={years} label="Model years" />
              </div>
            </div>

            {/* Right column — featured spotlight */}
            <div className="relative hidden lg:block">
              {featured ? (
                <FeaturedCard car={featured} />
              ) : (
                <div className="relative surface-card-glass overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-zinc-900/60" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 w-2/3 rounded bg-zinc-900" />
                    <div className="h-4 w-1/2 rounded bg-zinc-900" />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="h-12 rounded bg-zinc-900" />
                      <div className="h-12 rounded bg-zinc-900" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About the data */}
      <section className="page-wrap pt-12">
        <AboutData />
      </section>

      {/* Shop by need */}
      <section className="page-wrap py-16 border-b border-zinc-900">
        <SectionHeader
          kicker="Start here"
          title="Start with how you'll use it"
          subtitle="One tap opens a filtered search you can refine."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {LIFESTYLE_PRESETS.map((preset) => (
            <Link
              key={preset.id}
              to={`/home?${searchQueryToParams(presetToSearchQuery(preset), 1).toString()}`}
              className="surface-card-hover p-5 group flex flex-col rounded-lg"
            >
              <p className="font-semibold text-white">{preset.label}</p>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed flex-1">{preset.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-600 group-hover:text-white transition-colors">
                Explore <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
        <Link
          to="/browse"
          className="inline-block mt-6 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          See all browse options →
        </Link>
      </section>

      {/* Browse grid */}
      <section className="page-wrap py-16 border-b border-zinc-900">
        <SectionHeader kicker="Explore" title="Browse the archive" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {browseCards.map((card) => (
            <Link key={card.to} to={card.to} className="surface-card-hover p-6 group rounded-lg">
              <div className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:border-zinc-600 transition-colors mb-4">
                {card.icon}
              </div>
              <p className="font-semibold text-white mb-1 flex items-center justify-between">
                {card.title}
                <span className="text-zinc-600 group-hover:text-white transition-all group-hover:translate-x-0.5">→</span>
              </p>
              <p className="text-sm text-zinc-500">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Collections */}
      <section className="page-wrap py-16">
        <SectionHeader
          kicker="Hand-picked"
          title="Curated collections"
          subtitle="Hand-picked filters for common goals."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(COLLECTIONS).map((c) => (
            <Link
              key={c.id}
              to={`/collection/${c.id}`}
              className="surface-card-hover p-5 group flex flex-col rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] px-2 py-1 rounded-full border border-zinc-800 text-zinc-400">
                  {collectionCounts[c.id] != null
                    ? `${collectionCounts[c.id].toLocaleString()} vehicles`
                    : 'Curated set'}
                </span>
                <span className="text-zinc-600 group-hover:text-white transition-all group-hover:translate-x-0.5">→</span>
              </div>
              <p className="font-semibold text-white">{c.title}</p>
              <p className="text-sm text-zinc-500 mt-1">{c.subtitle}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-900">
        <div className="page-wrap py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-7 h-7 rounded-md border border-zinc-700 text-zinc-400">
              <IconGauge />
            </span>
            <span className="font-semibold text-zinc-300">CarInfo</span>
          </div>
          <p className="text-center">
            © {new Date().getFullYear()} CarInfo · EPA fuel economy · NHTSA safety · estimated market values
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
    <div className="relative animate-fade-in">
      <Link
        to={`/car/${car.id}`}
        className="relative block surface-card-glass overflow-hidden group rounded-xl border-zinc-800"
      >
        <div className="relative aspect-[16/10] border-b border-zinc-800/80">
          <VehiclePlaceholder car={car} />
          <span className="absolute left-4 top-4 z-10 text-xs font-medium text-zinc-300 border border-zinc-700 bg-black/70 px-2 py-0.5 rounded">
            Example vehicle
          </span>
        </div>
        <div className="p-6">
          <p className="text-sm font-medium text-zinc-500">{car.year}</p>
          <h3 className="text-xl font-semibold text-white mt-0.5 tracking-tight">
            {car.make} {car.model}
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <Tag>{car.bodyStyle}</Tag>
            <Tag>{formatFuelBadge(car.engine.fuelType)}</Tag>
            <Tag>{car.driveType}</Tag>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6">
            <div>
              <dt className="kicker">Horsepower</dt>
              <dd className="mt-1 text-xl font-semibold font-tabular text-white">{powerValue}</dd>
              <p className="text-[11px] text-zinc-500 mt-1">EPA rated, when on file</p>
            </div>
            <div>
              <dt className="kicker">Combined</dt>
              <dd className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-semibold font-tabular text-white">{mpgValue}</span>
                <span className="text-xs text-zinc-500">{mpgLabel}</span>
              </dd>
              <div className="meter-track mt-2">
                <div className="meter-fill animate-grow-x" style={{ width: `${mpgPct}%` }} />
              </div>
            </div>
            <div>
              <dt className="kicker">Drivetrain</dt>
              <dd className="mt-1 text-sm font-semibold text-white">
                {car.driveType} · {engineValue}
              </dd>
            </div>
            <div>
              <dt className="kicker">Safety</dt>
              <dd className="mt-1">
                {overall ? (
                  <Stars rating={overall} />
                ) : (
                  <span className="text-xs text-zinc-500 italic">Not rated</span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-zinc-500">
            Est. value {priceValue} · Ontario baseline
          </p>

          <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">
            View full breakdown
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </Link>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <span className="kicker">{kicker}</span>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="text-sm text-zinc-400 max-w-xl">{subtitle}</p>}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl md:text-[1.75rem] font-semibold font-tabular text-white leading-none tracking-tight">
        {value}
      </p>
      <p className="text-xs text-zinc-500 mt-1.5">{label}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 capitalize">
      {children}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${Math.round(rating)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-white' : 'text-zinc-700'}`}
          fill="currentColor"
          aria-hidden
        >
          <path d="M10 1.6l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.9 4.9 17.3l1-5.7-4.1-4 5.7-.8z" />
        </svg>
      ))}
    </span>
  );
}

function IconGauge() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" d="M4 18a8 8 0 1 1 16 0" />
      <path strokeLinecap="round" d="M12 14l3.5-3.5" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 17v-3l1.8-4.2A2 2 0 0 1 7.6 8.6h8.8a2 2 0 0 1 1.8 1.2L20 14v3" />
      <path d="M3 17h18" />
      <circle cx="7.5" cy="17" r="1.6" />
      <circle cx="16.5" cy="17" r="1.6" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 11.5l8-8 8.5 1 1 8.5-8 8z" />
      <circle cx="15" cy="9" r="1.4" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}
