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

  const vehicles = stats ? stats.totalCars.toLocaleString() : '28,000+';
  const makes = stats ? String(stats.totalMakes) : '89';
  const years = stats ? `${stats.yearRange.min}–${stats.yearRange.max}` : '1995–2026';

  return (
    <div className="min-h-screen bg-obsidian text-ivory selection:bg-champagne/20">
      {showQuiz && <PersonaQuiz onComplete={handleQuizComplete} />}

      <header
        className={`sticky top-0 z-40 transition-all duration-500 ${
          scrolled
            ? 'border-b border-[var(--border-subtle)] bg-obsidian/90 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="page-wrap py-5 flex items-center justify-between gap-6">
          <Link to="/" className="group flex items-baseline gap-3">
            <span className="kicker !text-[10px] !tracking-[0.35em] text-champagne group-hover:text-ivory transition-colors">
              CarInfo
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="nav-link" to="/browse">Browse</Link>
            <Link className="nav-link" to="/home">Search</Link>
            <Link className="nav-link" to="/value-matrix">Matrix</Link>
            <Link className="nav-link" to="/garage">Garage</Link>
          </nav>
          <button type="button" onClick={() => setShowQuiz(true)} className="btn-primary !py-2.5 !px-5 !text-xs">
            Concierge
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mesh-hero overflow-hidden">
        <div className="page-wrap pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 xl:gap-24 items-end">
            <div className="max-w-xl">
              <div className="rule-gold-short mb-8" />
              <p className="kicker">EPA & NHTSA archive</p>

              <h1 className="font-display text-[2.75rem] md:text-[3.5rem] xl:text-[4.25rem] text-ivory leading-[1.02] mt-5 mb-6">
                The reference for serious buyers
              </h1>

              <p className="text-base md:text-lg text-stone leading-relaxed font-light max-w-md">
                {vehicles} vehicles across {makes} marques, {years}. Verified specifications
                and discreet market estimates — composed for comparison, not sales pressure.
              </p>

              <div className="mt-12 max-w-lg">
                <SearchBar
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={handleHeroSearch}
                  size="large"
                  variant="luxury"
                  placeholder="Marque, model, or year"
                />
                <div className="mt-6 flex flex-wrap items-center gap-x-1 gap-y-2">
                  {QUICK_CHIPS.map((chip, i) => (
                    <span key={chip.label} className="flex items-center">
                      {i > 0 && <span className="text-champagne/30 mx-2 select-none">·</span>}
                      <Link
                        to={`/home?${searchQueryToParams(
                          filtersToSearchQuery(chip.filters, chip.sort),
                          1,
                        ).toString()}`}
                        className="chip"
                      >
                        {chip.label}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-14 grid grid-cols-3 gap-6 border-t border-[var(--border-subtle)] pt-8">
                <Stat value={vehicles} label="In archive" />
                <Stat value={makes} label="Marques" />
                <Stat value={years} label="Span" />
              </div>
            </div>

            <div className="relative hidden lg:block pb-2">
              {featured ? (
                <FeaturedCard car={featured} />
              ) : (
                <div className="luxury-frame animate-pulse">
                  <div className="luxury-frame-inner aspect-[4/5] bg-[#0f0e0c]" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rule-gold" />
      </section>

      <section className="page-wrap py-16 md:py-20">
        <AboutData />
      </section>

      {/* By intention */}
      <section className="page-wrap py-16 md:py-24 border-t border-[var(--border-subtle)]">
        <SectionHeader index="01" title="By intention" subtitle="Begin with purpose. Refine at leisure." />
        <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {LIFESTYLE_PRESETS.map((preset, i) => (
            <Link
              key={preset.id}
              to={`/home?${searchQueryToParams(presetToSearchQuery(preset), 1).toString()}`}
              className="exclusive-row group"
            >
              <div className="flex items-baseline gap-6 min-w-0">
                <span className="text-xs text-champagne/50 font-tabular w-6 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-2xl text-ivory group-hover:text-champagne transition-colors duration-300">
                    {preset.label}
                  </p>
                  <p className="text-sm text-stone mt-1 font-light">{preset.description}</p>
                </div>
              </div>
              <span className="text-champagne/40 group-hover:text-champagne transition-colors text-lg shrink-0">→</span>
            </Link>
          ))}
        </div>
        <Link to="/browse" className="inline-block mt-10 text-xs uppercase tracking-[0.2em] text-stone hover:text-champagne transition-colors">
          Full catalogue →
        </Link>
      </section>

      {/* Browse */}
      <section className="page-wrap py-16 md:py-24 border-t border-[var(--border-subtle)]">
        <SectionHeader index="02" title="The catalogue" />
        <div className="grid sm:grid-cols-2 gap-px bg-[var(--border-subtle)] border border-[var(--border-subtle)]">
          {[
            { to: '/explore/purpose', title: 'By need', desc: 'Commute, family, work' },
            { to: '/explore/body-style', title: 'By silhouette', desc: 'Sedan, SUV, coupe' },
            { to: '/explore/budget', title: 'By investment', desc: '$15k through $60k+' },
            { to: '/explore/era', title: 'By era', desc: '2020s to classics' },
          ].map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group bg-obsidian p-8 md:p-10 transition-colors duration-300 hover:bg-[#0f0e0c]"
            >
              <p className="kicker !text-[10px] mb-4">{card.desc}</p>
              <p className="font-display text-3xl text-ivory group-hover:text-champagne transition-colors duration-300">
                {card.title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Collections */}
      <section className="page-wrap py-16 md:py-24 border-t border-[var(--border-subtle)]">
        <SectionHeader
          index="03"
          title="Curated selections"
          subtitle="Editorial shortlists for distinct pursuits."
        />
        <div className="space-y-0">
          {Object.values(COLLECTIONS).map((c) => (
            <Link
              key={c.id}
              to={`/collection/${c.id}`}
              className="exclusive-row group"
            >
              <div className="min-w-0">
                <p className="font-display text-xl md:text-2xl text-ivory group-hover:text-champagne transition-colors duration-300">
                  {c.title}
                </p>
                <p className="text-sm text-stone mt-1 font-light">{c.subtitle}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs uppercase tracking-[0.15em] text-champagne/60">
                  {collectionCounts[c.id] != null
                    ? `${collectionCounts[c.id].toLocaleString()} vehicles`
                    : 'Curated'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border-subtle)] mt-8">
        <div className="page-wrap py-14 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <p className="kicker !text-[10px] !tracking-[0.35em]">CarInfo</p>
            <p className="text-sm text-stone mt-3 max-w-xs font-light leading-relaxed">
              A private reference. EPA fuel economy, NHTSA safety, estimated values in CAD.
            </p>
          </div>
          <p className="text-xs text-stone/70 uppercase tracking-[0.12em]">
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
    <div className="luxury-frame animate-fade-in">
      <Link to={`/car/${car.id}`} className="luxury-frame-inner block group overflow-hidden">
        <div className="relative aspect-[4/5] max-h-[520px]">
          <VehiclePlaceholder car={car} />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <p className="kicker !text-[10px] mb-3">Selection</p>
            <p className="font-display text-4xl text-ivory leading-none">{car.year}</p>
            <h3 className="font-display text-2xl text-champagne mt-2">
              {car.make} {car.model}
            </h3>
            <div className="flex flex-wrap gap-3 mt-4 text-[11px] uppercase tracking-[0.12em] text-stone">
              <span>{car.bodyStyle}</span>
              <span className="text-champagne/40">·</span>
              <span>{formatFuelBadge(car.engine.fuelType)}</span>
            </div>
          </div>
        </div>
        <div className="p-8 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-6">
          <div>
            <dt className="kicker !text-[10px]">Power</dt>
            <dd className="mt-2 font-display text-2xl text-ivory">{powerValue}</dd>
          </div>
          <div>
            <dt className="kicker !text-[10px]">{mpgLabel}</dt>
            <dd className="mt-2 font-display text-2xl text-ivory">{mpgValue}</dd>
            <div className="meter-track mt-3 h-px">
              <div className="meter-fill h-px" style={{ width: `${mpgPct}%` }} />
            </div>
          </div>
          <div className="col-span-2 pt-2 flex items-center justify-between text-xs text-stone font-light border-t border-[var(--border-subtle)]">
            <span>{car.driveType} · {engineValue}</span>
            <span>{overall ? `${overall}/5 NHTSA` : 'Safety unrated'}</span>
          </div>
          <p className="col-span-2 text-xs text-stone/80 font-light">
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
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-10 md:mb-14 flex flex-col gap-3">
      <span className="kicker">{index}</span>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="text-sm text-stone font-light max-w-md">{subtitle}</p>}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl md:text-4xl text-ivory leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone mt-2">{label}</p>
    </div>
  );
}
