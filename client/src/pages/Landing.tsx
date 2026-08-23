import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PersonaQuiz, { PersonaResult } from '../components/PersonaQuiz';
import AboutData from '../components/AboutData';
import SearchBar from '../components/SearchBar';
import SiteHeader from '../components/SiteHeader';
import HeroDossierPreview from '../components/HeroDossierPreview';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import * as api from '../services/api';
import type { CarDashboard, CarFilter, CarSpecs, SearchQuery } from '../types/car.types';
import { COLLECTIONS } from '../config/collections';
import {
  filtersToSearchQuery,
  fuelTypeFilter,
  bodyTypeFilter,
} from '../config/browseTaxonomy';
import { searchQueryToParams } from '../utils/searchParams';
import { formatFuelBadge, usesMpge } from '../utils/fuelDisplay';
import { displayModelLabel, displayListingSubtitle } from '../utils/trimLabel';
import { formatLPer100KmFromMpg, formatKwhPer100KmFromMpge } from '../utils/fuelEconomyUnits';
import {
  DOSSIER_EXAMPLE_QUERIES,
  HERO_PREVIEW_QUERY,
  pickHeroPreviewCar,
  pickFirstEligible,
  SHOWCASE_QUERIES,
  type ShowcaseQuery,
} from '../utils/landingShowcase';
import { usePageMeta } from '../utils/pageMeta';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

type ChipCountKey = 'electric' | 'suv' | 'under20k' | 'bestMpg';

interface QuickChip {
  label: string;
  filters: CarFilter;
  sort?: SearchQuery['sort'];
  countKey?: ChipCountKey;
}

const QUICK_CHIPS: QuickChip[] = [
  {
    label: 'Electric',
    filters: { fuelType: ['electric', 'hybrid', 'plug-in hybrid'] },
    sort: { field: 'year', order: 'desc' },
    countKey: 'electric',
  },
  { label: 'SUV', filters: { bodyStyle: ['suv'] }, countKey: 'suv' },
  {
    label: 'Under $20k',
    filters: { price: { max: 20000 } },
    sort: { field: 'price', order: 'asc' },
    countKey: 'under20k',
  },
  {
    label: 'Best fuel economy',
    filters: { fuelEconomy: { min: 35 } },
    sort: { field: 'fuelEconomy', order: 'desc' },
    countKey: 'bestMpg',
  },
];

interface ShowcaseItem {
  car: CarSpecs;
  insight: ShowcaseQuery['insight'];
}

interface DossierExample {
  question: string;
  car: CarSpecs;
}

const BROWSE_TILES = [
  { label: 'Sedans', bodyStyle: 'sedan' },
  { label: 'SUVs', bodyStyle: 'suv' },
  { label: 'Electric', fuelType: 'electric' },
  { label: 'Hybrids', fuelType: 'hybrid' },
] as const;

const DOSSIER_QUESTIONS = DOSSIER_EXAMPLE_QUERIES.map((q) => q.question);

export default function Landing() {
  usePageMeta(
    'Car reference with verified specs',
    'Browse 28,000+ vehicles with EPA fuel economy, NHTSA safety when on file, and labeled Ontario/CAD market estimates.',
  );
  const [showQuiz, setShowQuiz] = useState(false);
  const [stats, setStats] = useState<{
    totalCars: number;
    totalMakes: number;
    yearRange: { min: number; max: number };
    bodyStyles?: Record<string, number>;
    fuelTypes?: Record<string, number>;
  } | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
  const [chipCounts, setChipCounts] = useState<Partial<Record<ChipCountKey, number>>>({});
  const [heroQuery, setHeroQuery] = useState('');
  const [heroDashboard, setHeroDashboard] = useState<CarDashboard | null>(null);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [dossierExamples, setDossierExamples] = useState<DossierExample[]>([]);
  const [vinInput, setVinInput] = useState('');
  const navigate = useNavigate();

  const handleHeroSearch = (q: string) => {
    const trimmed = q.trim();
    if (VIN_PATTERN.test(trimmed)) {
      navigate(`/vin?vin=${encodeURIComponent(trimmed.toUpperCase())}`);
      return;
    }
    const params = new URLSearchParams();
    if (trimmed) {
      params.set('q', trimmed);
      params.set('sort', 'relevance');
    }
    navigate(`/home?${params.toString()}`);
  };

  const handleVinSubmit = () => {
    const v = vinInput.trim().toUpperCase();
    if (!v) return;
    navigate(`/vin?vin=${encodeURIComponent(v)}`);
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
            bodyStyles: data.bodyStyles,
            fuelTypes: data.fuelTypes,
          });
          const ft = data.fuelTypes ?? {};
          const electricSum =
            (ft.electric ?? 0) + (ft.hybrid ?? 0) + (ft['plug-in hybrid'] ?? 0);
          setChipCounts((prev) => ({
            ...prev,
            electric: electricSum,
            suv: data.bodyStyles?.suv,
          }));
        }
      })
      .catch(() => {});

    api
      .searchCars(HERO_PREVIEW_QUERY)
      .then(async (res) => {
        const car = pickHeroPreviewCar(res.results);
        if (!car) return;
        const dashboard = await api.getCarDashboard(car.id);
        setHeroDashboard(dashboard);
      })
      .catch(() => {});

    const used = new Set<string>();
    (async () => {
      const items: ShowcaseItem[] = [];

      await Promise.all(
        SHOWCASE_QUERIES.map(async ({ insight, query }) => {
          try {
            const res = await api.searchCars(query);
            const car = pickFirstEligible(res.results, insight, used);
            if (car) items.push({ car, insight });
          } catch {
            /* skip */
          }
        }),
      );

      setShowcase(items);
    })();

    Promise.all([
      api.searchCars({
        filters: { price: { max: 20000 } },
        limit: 1,
        offset: 0,
      }),
      api.searchCars({
        filters: { fuelEconomy: { min: 35 } },
        limit: 1,
        offset: 0,
      }),
    ])
      .then(([under20, bestMpg]) => {
        setChipCounts((prev) => ({
          ...prev,
          under20k: under20.total,
          bestMpg: bestMpg.total,
        }));
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

  useEffect(() => {
    if (showcase.length === 0 && !heroDashboard) return;
    const exampleCars: CarSpecs[] = [];
    if (heroDashboard?.car) exampleCars.push(heroDashboard.car);
    for (const item of showcase) {
      if (!exampleCars.some((c) => c.id === item.car.id)) exampleCars.push(item.car);
    }
    if (exampleCars.length === 0) return;
    setDossierExamples(
      DOSSIER_QUESTIONS.slice(0, exampleCars.length).map((question, i) => ({
        question,
        car: exampleCars[i],
      })),
    );
  }, [heroDashboard, showcase]);

  const vehicles = stats ? stats.totalCars.toLocaleString() : '28,000+';
  const makes = stats ? String(stats.totalMakes) : '89';
  const years = stats ? `${stats.yearRange.min}-${stats.yearRange.max}` : '1995-2026';

  const browseCount = (tile: (typeof BROWSE_TILES)[number]) => {
    if ('bodyStyle' in tile && tile.bodyStyle) {
      return stats?.bodyStyles?.[tile.bodyStyle];
    }
    if ('fuelType' in tile && tile.fuelType) {
      return stats?.fuelTypes?.[tile.fuelType];
    }
    return undefined;
  };

  const browseLink = (tile: (typeof BROWSE_TILES)[number]) => {
    if ('bodyStyle' in tile && tile.bodyStyle) {
      return `/home?${searchQueryToParams(filtersToSearchQuery(bodyTypeFilter(tile.bodyStyle)), 1).toString()}`;
    }
    return `/home?${searchQueryToParams(filtersToSearchQuery(fuelTypeFilter(tile.fuelType!)), 1).toString()}`;
  };

  const chipLabel = (chip: QuickChip) => {
    const count = chip.countKey ? chipCounts[chip.countKey] : undefined;
    if (count == null) return chip.label;
    return (
      <>
        {chip.label}{' '}
        <span className="text-zinc-500 font-tabular">({count.toLocaleString()})</span>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      {showQuiz && <PersonaQuiz onComplete={handleQuizComplete} />}

      <SiteHeader transparentUntilScroll />

      {/* ── Hero + showcase (tight vertical rhythm) ── */}
      <section className="relative mesh-hero">
        <div className="page-wrap pt-8 pb-12 md:pt-12 md:pb-14">
          <div className="lg:grid lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1.1fr_0.9fr] gap-10 xl:gap-14 items-start">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-4 animate-hero-rise">
                Car specs, explained
              </h1>
              <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-lg mb-8 animate-hero-rise [animation-delay:50ms]">
                EPA fuel economy, engine and drivetrain details, and NHTSA safety ratings, with
                plain-English notes on every vehicle page.
              </p>

              <div className="grid grid-cols-3 divide-x divide-zinc-800 border-y border-zinc-800 mb-8 animate-hero-rise [animation-delay:100ms]">
                <Stat value={vehicles} label="Vehicles" />
                <Stat value={makes} label="Brands" />
                <Stat value={years} label="Model years" />
              </div>

              <div className="w-full max-w-none animate-hero-rise [animation-delay:150ms]">
                <SearchBar
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={handleHeroSearch}
                  size="hero"
                  placeholder="Make, model, year, or VIN"
                />

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowQuiz(true)}
                    className="text-sm text-zinc-300 hover:text-white transition-colors text-left"
                  >
                    Not sure what you want?{' '}
                    <span className="text-white font-medium">Answer 3 questions →</span>
                  </button>
                  <Link
                    to="/vin"
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                  >
                    Have a VIN? Look it up directly →
                  </Link>
                </div>

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
                      {chipLabel(chip)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {heroDashboard && (
              <div className="hidden lg:block lg:sticky lg:top-24 animate-fade-in">
                <HeroDossierPreview dashboard={heroDashboard} />
              </div>
            )}
          </div>
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="page-wrap py-12 md:py-14 border-t border-zinc-900">
          <SectionHeader
            kicker="Explore"
            title="See what's in the database"
            subtitle="Fuel economy, powertrain specs, and crash-test ratings from EPA and NHTSA."
          />
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 border border-zinc-800">
            {showcase.map(({ car, insight }, index) => (
              <ShowcaseCard
                key={`${car.id}-${insight}`}
                car={car}
                insight={insight}
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
        </section>
      )}

      {dossierExamples.length > 0 && (
        <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
          <SectionHeader
            kicker="Dossier"
            title="On every vehicle page"
            subtitle="Full specs with short explanations: engine, MPG, drivetrain, safety, and more."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {dossierExamples.map(({ question, car }) => (
              <Link
                key={question}
                to={`/car/${car.id}`}
                className="group p-4 border border-zinc-800 rounded-none hover:border-zinc-600 transition-colors"
              >
                <p className="text-sm font-medium text-white group-hover:text-zinc-200 transition-colors">
                  {question}
                </p>
                <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                  See on {car.year} {car.make} {displayModelLabel(car)} →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader
          kicker="Browse"
          title="Browse by category"
          subtitle="Explore the full database. No search term required."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {BROWSE_TILES.map((tile) => {
            const count = browseCount(tile);
            return (
              <Link
                key={tile.label}
                to={browseLink(tile)}
                className="group p-4 border border-zinc-800 rounded-none hover:border-zinc-600 transition-colors min-h-[100px] flex flex-col justify-center"
              >
                <p className="text-lg font-semibold text-white group-hover:text-zinc-200 transition-colors">
                  {tile.label}
                </p>
                {count != null && (
                  <p className="text-sm text-zinc-500 mt-1.5 font-tabular">
                    {count.toLocaleString()} vehicles
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        <Link
          to="/browse"
          className="inline-block mt-6 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          All browse categories →
        </Link>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <div className="border border-zinc-800 rounded-none bg-zinc-950/50 p-5 md:p-8">
          <div className="lg:grid lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-10 lg:items-center">
            <SectionHeader
              kicker="VIN lookup"
              title="Already own a car?"
              subtitle="Enter your VIN to see fuel economy, specs, and estimated value for that exact vehicle."
            />
            <div className="flex border border-zinc-700 rounded-none">
              <input
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase().slice(0, 17))}
                onKeyDown={(e) => e.key === 'Enter' && handleVinSubmit()}
                placeholder="17-character VIN"
                spellCheck={false}
                className="flex-1 h-14 lg:h-16 bg-zinc-950 border-0 px-4 text-base font-mono tracking-widest text-white placeholder:text-zinc-600 focus:outline-none rounded-none uppercase"
              />
              <button
                type="button"
                onClick={handleVinSubmit}
                disabled={vinInput.trim().length < 11}
                className="h-14 lg:h-16 px-8 bg-white text-black text-sm font-semibold uppercase tracking-widest rounded-none hover:bg-zinc-200 transition-colors shrink-0 disabled:opacity-40 border-l border-zinc-700"
              >
                Search by VIN
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader kicker="Sources" title="How the data works" />
        <div className="grid sm:grid-cols-3 gap-8">
          <div>
            <p className="text-4xl font-bold text-zinc-700 mb-3 leading-none" aria-hidden>
              E
            </p>
            <p className="text-base font-semibold text-white mb-2">EPA verified</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Fuel economy and powertrain specs from EPA laboratory testing, the same figures on window stickers.
              figures on window stickers.
            </p>
          </div>
          <div>
            <p className="text-4xl font-bold text-zinc-700 mb-3 leading-none" aria-hidden>
              N
            </p>
            <p className="text-base font-semibold text-white mb-2">NHTSA when available</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Crash-test safety ratings from NHTSA where they match this EPA configuration.
              Many vehicles share ratings across trims.
            </p>
          </div>
          <div>
            <p className="text-4xl font-bold text-zinc-700 mb-3 leading-none" aria-hidden>
              ON
            </p>
            <p className="text-base font-semibold text-white mb-2">Ontario estimates modeled</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Value and ownership cost figures are Ontario-baseline estimates in CAD, built for
              comparison and planning, not live dealer quotes.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <AboutData compact />
        </div>
      </section>

      <section className="page-wrap py-12 md:py-16 border-t border-zinc-900">
        <SectionHeader
          kicker="Curated"
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
                <p className="text-base sm:text-lg font-semibold text-white tracking-tight group-hover:text-zinc-300 transition-colors">
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
              EPA specs, NHTSA safety, and plain-English explanations on every vehicle page.
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

function ShowcaseCard({
  car,
  insight,
  style,
}: {
  car: CarSpecs;
  insight: ShowcaseQuery['insight'];
  style?: React.CSSProperties;
}) {
  const mpgLabel = usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
  const combined = car.fuelEconomy?.combined ?? 0;
  const safety = car.safetyRating?.overall;
  const subtitle = displayListingSubtitle(car);
  const hp = car.engine.horsepower;

  const theme =
    insight === 'fuel'
      ? 'Fuel efficiency'
      : insight === 'power'
        ? 'Powertrain'
        : safety
          ? 'Safety record'
          : 'Efficiency';

  const secondaryLine = (() => {
    if (insight === 'fuel') {
      return usesMpge(car.engine.fuelType)
        ? formatKwhPer100KmFromMpge(combined)
        : formatLPer100KmFromMpg(combined);
    }
    if (insight === 'power' && hp) {
      return `${car.driveType} · ${formatFuelBadge(car.engine.fuelType)}`;
    }
    if (safety) {
      return `${car.year} ${displayModelLabel(car)}`;
    }
    return formatLPer100KmFromMpg(combined) || formatFuelBadge(car.engine.fuelType);
  })();

  const primaryMetric = (() => {
    if (insight === 'fuel') {
      return { value: String(Math.round(combined)), unit: mpgLabel };
    }
    if (insight === 'power' && hp) {
      return { value: String(Math.round(hp)), unit: 'HP' };
    }
    if (safety) {
      return {
        value: '★'.repeat(safety) + '☆'.repeat(5 - safety),
        unit: 'NHTSA',
      };
    }
    return { value: String(Math.round(combined)), unit: mpgLabel };
  })();

  const tertiary =
    insight === 'fuel'
      ? `${car.year} ${car.make} ${displayModelLabel(car)}`
      : insight === 'power'
        ? `${car.year} ${car.make} ${displayModelLabel(car)}`
        : safety
          ? `${safety}/5 overall`
          : `${combined} ${mpgLabel}`;

  return (
    <Link
      to={`/car/${car.id}`}
      className="group bg-zinc-950 border-0 overflow-hidden flex flex-col animate-fade-in opacity-0 [animation-fill-mode:forwards] hover:bg-black transition-colors"
      style={style}
    >
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800 px-4 py-2">
        {theme}
      </p>
      <div className="relative h-24 overflow-hidden border-b border-zinc-800">
        <VehiclePlaceholder car={car} compact className="!absolute inset-0" />
      </div>
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">
            {car.year} {car.make}
          </p>
          <h3 className="text-base font-medium text-white tracking-tight group-hover:text-zinc-200 transition-colors">
            {displayModelLabel(car)}
          </h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
        </div>

        <div className="mt-auto">
          {primaryMetric.unit ? (
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-bold text-white leading-none tabular-nums">
                {primaryMetric.value}
              </span>
              <span className="text-sm uppercase text-zinc-400 tracking-wider">{primaryMetric.unit}</span>
            </div>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-white leading-tight tabular-nums">
              {primaryMetric.value}
            </p>
          )}
          {secondaryLine && (
            <p className="text-xs text-zinc-500 mt-2">{secondaryLine}</p>
          )}
          <p className="text-xs text-zinc-600 mt-1">{tertiary}</p>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 sm:mb-6 flex flex-col gap-1 sm:gap-1.5 border-t border-zinc-800 pt-4">
      {kicker && <span className="kicker">{kicker}</span>}
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  // Year ranges like "1995-2026" need smaller type than "89" so they are not clipped.
  const compact = value.length > 5;
  return (
    <div className="min-w-0 px-1.5 sm:px-3 md:px-4 py-4 text-center">
      <p
        className={`font-bold text-white leading-none tabular-nums tracking-tight ${
          compact
            ? 'text-lg sm:text-2xl md:text-3xl lg:text-4xl'
            : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 mt-2">{label}</p>
    </div>
  );
}
