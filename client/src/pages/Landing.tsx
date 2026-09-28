import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PersonaQuiz, { type PersonaResult } from '../components/PersonaQuiz';
import SearchBar from '../components/SearchBar';
import SiteHeader from '../components/SiteHeader';
import SampleCarCard from '../components/SampleCarCard';
import ShortlistCards from '../components/ShortlistCards';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { LIFESTYLE_PRESETS, POPULAR_SEARCHES, presetToSearchQuery } from '../config/browseTaxonomy';
import { searchQueryToParams } from '../utils/searchParams';
import { HERO_PREVIEW_QUERY, pickHeroPreviewCar } from '../utils/landingShowcase';
import { usePageMeta } from '../utils/pageMeta';
import CompareTray from '../components/CompareTray';
import { useCarStore } from '../stores/carStore';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

function homeLinkFromPreset(preset: (typeof LIFESTYLE_PRESETS)[number]) {
  return `/home?${searchQueryToParams(presetToSearchQuery(preset), 1).toString()}`;
}

export default function Landing() {
  usePageMeta(
    'Car specs from the EPA and NHTSA',
    'Browse 35,000+ vehicles with EPA fuel economy and range in Canadian units, NHTSA crash ratings when on file, and rated power, each marked with its source.',
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
  const navigate = useNavigate();
  const compareCount = useCarStore((s) => s.comparedCars.length);
  const trayPad = compareCount > 0 ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]' : '';

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
  }, []);

  const situationPresets = LIFESTYLE_PRESETS.slice(0, 4);

  return (
    <div className={`min-h-screen bg-black text-white selection:bg-white/20 ${trayPad}`}>
      {showQuiz && <PersonaQuiz onComplete={handleQuizComplete} />}

      {/* The landing page renders outside Layout, so it carries its own skip
          link and main landmark — without them keyboard users had to tab
          through the whole header, and screen readers found no main region. */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <SiteHeader transparentUntilScroll />

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <section className="mesh-hero">
          <div className="hero-content page-wrap pt-10 pb-10 md:pt-16 md:pb-16 lg:pt-20 lg:pb-20 grid lg:grid-cols-[minmax(0,1fr)_23rem] gap-10 lg:gap-14 items-center">
            <div className="max-w-xl min-w-0">
              {/* The promise, not the brand: the header already says CarInfo. */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.05] mb-4 animate-hero-rise">
                Car specs from the EPA and NHTSA
              </h1>
              <p className="text-base md:text-lg text-zinc-300 leading-relaxed mb-6 md:mb-8 animate-hero-rise [animation-delay:40ms]">
                Fuel use and range from EPA tests, crash ratings from NHTSA, and rated power for
                35,000+ vehicles, in Canadian units and marked with their source. Anything we
                estimate is labeled as an estimate.
              </p>

              <div className="animate-hero-rise [animation-delay:80ms]">
                <SearchBar
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={handleHeroSearch}
                  size="hero"
                  placeholder="Make, model, or VIN"
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="text-zinc-400">A 17-character VIN works too.</span>
                  <button
                    type="button"
                    onClick={() => setShowQuiz(true)}
                    className="text-accent hover:text-accent-hover font-medium min-h-[44px] inline-flex items-center"
                  >
                    Not sure yet? Answer 3 questions →
                  </button>
                </div>
              </div>
            </div>
            {heroCar && (
              <div className="animate-hero-rise [animation-delay:120ms] w-full max-w-md lg:max-w-none">
                <SampleCarCard car={heroCar} />
              </div>
            )}
          </div>
        </section>

        <section className="page-wrap section-y border-t border-zinc-900">
          <h2 className="section-title mb-2">How do you want to start?</h2>
          <p className="text-[15px] text-zinc-400 mb-6 md:mb-8 max-w-xl leading-relaxed">
            Most people arrive with one of these in mind.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white mb-3">I know the car</h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <Link
                    key={s.query}
                    to={`/home?${new URLSearchParams({ q: s.query, sort: 'relevance' }).toString()}`}
                    className="chip"
                  >
                    {s.label}
                  </Link>
                ))}
                <Link to="/home" className="chip border-transparent text-zinc-400">
                  Open search →
                </Link>
              </div>
            </div>

            <div className="border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white mb-3">I&apos;m still deciding</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowQuiz(true)} className="chip chip-on">
                  Take the 3-question quiz
                </button>
                {situationPresets.map((preset) => (
                  <Link key={preset.id} to={homeLinkFromPreset(preset)} className="chip">
                    {preset.label}
                  </Link>
                ))}
                <Link to="/browse" className="chip border-transparent text-zinc-400">
                  All situations →
                </Link>
              </div>
            </div>

            <div className="border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white mb-1">I have a VIN</h3>
              <p className="text-[13px] text-zinc-400 mb-3">
                Paste it in the search above, or scan the barcode with your phone.
              </p>
              <Link to="/vin" className="chip">
                Decode a VIN →
              </Link>
            </div>

            <div className="border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white mb-1">
                I&apos;m comparing options
              </h3>
              <p className="text-[13px] text-zinc-400 mb-3">
                Put cars side by side, or see the whole market on one chart.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/compare" className="chip">
                  Side-by-side compare
                </Link>
                <Link to="/value-matrix" className="chip">
                  Value chart
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="page-wrap section-y border-t border-zinc-900">
          <h2 className="section-title mb-2">Curated shortlists</h2>
          <p className="text-[15px] text-zinc-400 mb-6 max-w-xl leading-relaxed">
            Ranked picks for common situations, one per model, not every trim on file.
          </p>
          <ShortlistCards />
        </section>
      </main>

      <footer className="border-t border-zinc-900">
        <div className="page-wrap py-8 sm:py-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-white">CarInfo</p>
            <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
              EPA specs, NHTSA safety, and labeled estimates on every vehicle page.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
            <Link to="/vin" className="hover:text-white">
              VIN lookup
            </Link>
            <Link to="/methodology" className="hover:text-white">
              Methodology
            </Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

      <CompareTray />
    </div>
  );
}
