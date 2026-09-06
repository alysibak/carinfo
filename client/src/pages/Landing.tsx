import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PersonaQuiz, { PersonaResult } from '../components/PersonaQuiz';
import SearchBar from '../components/SearchBar';
import SiteHeader from '../components/SiteHeader';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { COLLECTIONS } from '../config/collections';
import {
  LIFESTYLE_PRESETS,
  POPULAR_SEARCHES,
  presetToSearchQuery,
} from '../config/browseTaxonomy';
import { searchQueryToParams } from '../utils/searchParams';
import { formatFuelBadge, usesMpge } from '../utils/fuelDisplay';
import { displayModelLabel, displayListingSubtitle } from '../utils/trimLabel';
import { formatLPer100KmFromMpg, formatKwhPer100KmFromMpge } from '../utils/fuelEconomyUnits';
import {
  HERO_PREVIEW_QUERY,
  pickHeroPreviewCar,
  pickFirstEligible,
  SHOWCASE_QUERIES,
  type ShowcaseQuery,
} from '../utils/landingShowcase';
import { usePageMeta } from '../utils/pageMeta';
import CompareTray from '../components/CompareTray';
import VisitCounter from '../components/VisitCounter';
import { useCarStore } from '../stores/carStore';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

interface ShowcaseItem {
  car: CarSpecs;
  insight: ShowcaseQuery['insight'];
}

function homeLinkFromPreset(preset: (typeof LIFESTYLE_PRESETS)[number]) {
  return `/home?${searchQueryToParams(presetToSearchQuery(preset), 1).toString()}`;
}

export default function Landing() {
  usePageMeta(
    'Car reference with verified specs',
    'Browse 28,000+ vehicles with EPA fuel economy, NHTSA safety when on file, and labeled Ontario/CAD market estimates.',
  );
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('quiz') === '1') {
      setShowQuiz(true);
      params.delete('quiz');
      const next = params.toString();
      window.history.replaceState({}, '', next ? `/?${next}` : '/');
    }
  }, []);
  const [heroQuery, setHeroQuery] = useState('');
  const [heroCar, setHeroCar] = useState<CarSpecs | null>(null);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const navigate = useNavigate();
  const compareCount = useCarStore((s) => s.comparedCars.length);
  const trayPad =
    compareCount > 0 ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]' : '';

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
      .searchCars(HERO_PREVIEW_QUERY)
      .then((res) => {
        const car = pickHeroPreviewCar(res.results);
        if (car) setHeroCar(car);
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

  }, []);

  const situationPresets = LIFESTYLE_PRESETS.slice(0, 4);

  return (
    <div className={`min-h-screen bg-black text-white selection:bg-white/20 ${trayPad}`}>
      {showQuiz && <PersonaQuiz onComplete={handleQuizComplete} />}

      <SiteHeader transparentUntilScroll />

      <section className="mesh-hero">
        {heroCar && (
          <div className="hero-plane hidden lg:block" aria-hidden>
            <div className="absolute inset-y-0 right-0 w-[58%] opacity-50">
              <VehiclePlaceholder car={heroCar} hideCaption className="h-full" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
          </div>
        )}

        <div className="hero-content page-wrap pt-10 pb-12 md:pt-24 md:pb-28 lg:min-h-[calc(100svh-var(--header-height))] lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-xl min-w-0">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-4 animate-hero-rise">
              CarInfo
            </h1>
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-8 animate-hero-rise [animation-delay:40ms]">
              Specs you can trust — EPA, NHTSA when on file, and labeled Ontario estimates.
              Look up a car, or answer three questions.
            </p>

            <div className="animate-hero-rise [animation-delay:80ms]">
              <SearchBar
                value={heroQuery}
                onChange={setHeroQuery}
                onSubmit={handleHeroSearch}
                size="hero"
                placeholder="Make, model, or VIN"
              />
              <p className="mt-3 text-sm text-zinc-500">
                Paste a 17-character VIN in the same box.{' '}
                <button
                  type="button"
                  onClick={() => setShowQuiz(true)}
                  className="text-zinc-300 hover:text-white transition-colors underline underline-offset-4 decoration-zinc-700"
                >
                  Or answer 3 questions
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-wrap py-14 md:py-20 border-t border-zinc-900">
        <h2 className="section-title mb-2">How do you want to start?</h2>
        <p className="text-sm text-zinc-400 mb-10 max-w-xl leading-relaxed">
          Most people arrive with one of these in mind. Pick the path that matches.
        </p>

        <div>
          <div className="intent-row">
            <p className="text-sm font-semibold text-white">I know the car</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {POPULAR_SEARCHES.map((s) => (
                <Link
                  key={s.query}
                  to={`/home?${new URLSearchParams({ q: s.query, sort: 'relevance' }).toString()}`}
                  className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
                >
                  {s.label}
                </Link>
              ))}
              <Link to="/home" className="text-zinc-500 hover:text-zinc-300">
                Open search →
              </Link>
            </div>
          </div>

          <div className="intent-row">
            <p className="text-sm font-semibold text-white">I&apos;m still deciding</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                onClick={() => setShowQuiz(true)}
                className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
              >
                3-question quiz
              </button>
              {situationPresets.map((preset) => (
                <Link
                  key={preset.id}
                  to={homeLinkFromPreset(preset)}
                  className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
                >
                  {preset.label}
                </Link>
              ))}
              <Link to="/browse" className="text-zinc-500 hover:text-zinc-300">
                All guides →
              </Link>
            </div>
          </div>

          <div className="intent-row">
            <p className="text-sm font-semibold text-white">I have a VIN</p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Drop it in the search above, or use{' '}
              <Link to="/vin" className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700">
                VIN lookup
              </Link>{' '}
              if you want the scanner.
            </p>
          </div>

          <div className="intent-row border-b-0">
            <p className="text-sm font-semibold text-white">I&apos;m comparing options</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                to="/compare"
                className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
              >
                Side-by-side compare
              </Link>
              <Link
                to="/value-matrix"
                className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
              >
                Value chart
              </Link>
            </div>
          </div>
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="border-t border-zinc-900">
          <div className="page-wrap py-14 md:py-20">
            <h2 className="section-title mb-2">What a dossier looks like</h2>
            <p className="text-sm text-zinc-400 mb-10 max-w-xl leading-relaxed">
              Every vehicle page leads with the numbers people actually weigh: efficiency, safety,
              and estimated value.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 border-y border-zinc-800">
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

      <section className="page-wrap py-14 md:py-20 border-t border-zinc-900">
        <h2 className="section-title mb-2">Curated shortlists</h2>
        <p className="text-sm text-zinc-400 mb-8 max-w-xl leading-relaxed">
          A few ranked picks for common situations — not every matching trim in the archive.
        </p>
        <div>
          {Object.values(COLLECTIONS).map((c) => (
            <Link key={c.id} to={`/collection/${c.id}`} className="list-row group">
              <div className="min-w-0 pr-4">
                <p className="text-base font-semibold text-white tracking-tight group-hover:text-zinc-300 transition-colors">
                  {c.title}
                </p>
                <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">{c.subtitle}</p>
              </div>
              <p className="text-xs text-zinc-500 whitespace-nowrap shrink-0">
                Picks →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-900">
        <div className="page-wrap py-10 sm:py-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-white">CarInfo</p>
            <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
              EPA specs, NHTSA safety, and labeled estimates on every vehicle page.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
            <Link to="/vin" className="hover:text-white">VIN lookup</Link>
            <Link to="/methodology" className="hover:text-white">Methodology</Link>
            <VisitCounter className="text-zinc-500" />
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

      <CompareTray />
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
        value: String(safety),
        unit: '/5',
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
      className="group bg-black overflow-hidden flex flex-col animate-fade-in opacity-0 [animation-fill-mode:forwards] hover:bg-zinc-950 transition-colors"
      style={style}
    >
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-5 md:px-8 pt-5">
        {theme}
      </p>
      <div className="relative h-24 overflow-hidden">
        <VehiclePlaceholder car={car} compact hideCaption className="!absolute inset-0" />
      </div>
      <div className="px-5 md:px-8 pb-8 pt-4 flex flex-col flex-1 gap-4">
        <div>
          <p className="text-xs text-zinc-500">
            {car.year} {car.make}
          </p>
          <h3 className="text-lg font-semibold text-white tracking-tight">
            {displayModelLabel(car)}
          </h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
        </div>

        <div className="mt-auto">
          {primaryMetric.unit ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-none tabular-nums">
                {primaryMetric.value}
              </span>
              <span className="text-sm uppercase text-zinc-500 tracking-wider">{primaryMetric.unit}</span>
            </div>
          ) : (
            <p className="text-2xl font-bold text-white leading-tight tabular-nums">
              {primaryMetric.value}
            </p>
          )}
          {secondaryLine && <p className="text-xs text-zinc-500 mt-2">{secondaryLine}</p>}
          <p className="text-xs text-zinc-500 mt-1">{tertiary}</p>
        </div>
      </div>
    </Link>
  );
}
