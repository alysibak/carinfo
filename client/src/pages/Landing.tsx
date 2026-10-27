import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import SampleCarCard from '../components/SampleCarCard';
import PhotoGlow from '../components/PhotoGlow';
import MakesBand from '../components/MakesBand';
import CatalogueStats from '../components/CatalogueStats';
import ShortlistCards from '../components/ShortlistCards';
import { COLLECTIONS } from '../config/collections';
import BestSellers from '../components/BestSellers';
import RecentlyViewed from '../components/RecentlyViewed';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { HERO_PREVIEW_QUERY, pickHeroPreviewCar } from '../utils/landingShowcase';
import { usePageMeta } from '../utils/pageMeta';
import CompareTray from '../components/CompareTray';
import MobileTabBar from '../components/MobileTabBar';
import ErrorBoundary from '../components/ErrorBoundary';
import { useCarStore } from '../stores/carStore';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

/** Where people start, a line each. */
const START_POINTS = [
  { label: 'I know the car', note: 'Search its make, model or year', to: '/home' },
  {
    label: 'I’m still deciding',
    note: 'Start from what you need it for: commuting, a family, a first car',
    to: '/browse',
  },
  {
    label: 'Safety first',
    note: 'Five crash-test stars, collision warning, no recalls',
    to: '/browse#record',
  },
  {
    label: 'I have a VIN',
    note: 'What it is, and its year’s recalls, complaints and crash rating',
    to: '/vin',
  },
  {
    label: 'I’m comparing options',
    note: 'Popular match-ups side by side in one tap, or any cars you pick',
    to: '/compare',
  },
  {
    label: 'The whole market',
    note: 'Every car’s value against its fuel use',
    to: '/value-matrix',
  },
];

export default function Landing() {
  usePageMeta(
    'Compare cars with facts you can check',
    'Look up 35,000+ versions of cars since 1995: fuel use and range from official EPA tests, NHTSA crash ratings when on file, and rated power, in Canadian units, each marked with its source.',
  );
  const [heroQuery, setHeroQuery] = useState('');
  const [heroCar, setHeroCar] = useState<CarSpecs | null>(null);
  const navigate = useNavigate();

  // Links to the old 3-question quiz land on Browse, where its choices now live.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('quiz') === '1') {
      navigate('/browse', { replace: true });
    }
  }, [navigate]);
  const compareCount = useCarStore((s) => s.comparedCars.length);
  const trayPad =
    compareCount > 0
      ? 'pb-[max(var(--tabbar-height),calc(4.25rem+env(safe-area-inset-bottom)))] tabbar-shown:pb-(--tabbar-height)'
      : 'pb-(--tabbar-height)';

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

  useEffect(() => {
    api
      .searchCars(HERO_PREVIEW_QUERY)
      .then((res) => {
        const car = pickHeroPreviewCar(res.results);
        if (car) setHeroCar(car);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={`min-h-screen bg-black text-white ${trayPad}`}>
      {/* The landing page renders outside Layout, so it carries its own skip
          link and main landmark — without them keyboard users had to tab
          through the whole header, and screen readers found no main region. */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <SiteHeader transparentUntilScroll />

      <main id="main-content" tabIndex={-1} className="focus:outline-hidden">
        <section className="aurora bg-black border-b border-zinc-900">
          {/* A fine grid under the light, fading out toward the edges. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(ellipse_75%_65%_at_40%_35%,#000_25%,transparent_80%)]"
          />
          <div className="page-wrap pt-12 pb-14 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 lg:gap-14 items-center">
            <div className="max-w-2xl min-w-0">
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400 mb-6 animate-hero-rise">
                <span aria-hidden className="h-px w-10 bg-accent" />
                Public records, in plain words
              </p>
              {/* The promise, not the brand: the header already says CarInfo. */}
              <h1 className="display-text text-[2.9rem] sm:text-6xl lg:text-[5.4rem] pb-2 mb-5 animate-hero-rise [animation-delay:30ms]">
                Compare cars with facts you can check
              </h1>
              <p className="text-base md:text-lg text-zinc-300 leading-relaxed mb-8 md:mb-10 max-w-xl animate-hero-rise [animation-delay:60ms]">
                Fuel use and range from official EPA tests and crash-test stars from NHTSA, in
                litres and kilometres. Every figure says where it came from, and anything we
                estimate, like a car’s value, is marked as an estimate.
              </p>

              <div className="animate-hero-rise [animation-delay:80ms]">
                <SearchBar
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={handleHeroSearch}
                  size="hero"
                  placeholder="Make, model, or VIN"
                  siteSearch
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="text-zinc-400">A 17-character VIN works too.</span>
                  <Link
                    to="/browse"
                    className="text-white font-medium underline underline-offset-4 decoration-zinc-500 hover:decoration-white min-h-[44px] inline-flex items-center"
                  >
                    Not sure yet? Start from what you need →
                  </Link>
                </div>
              </div>
              <ErrorBoundary fallback={null}>
                <CatalogueStats className="mt-8 pt-6 border-t border-zinc-800/80 animate-hero-rise [animation-delay:100ms]" />
              </ErrorBoundary>
            </div>
            {heroCar && (
              <div className="relative isolate animate-hero-rise [animation-delay:120ms] w-full max-w-xl lg:max-w-none">
                {/* The car's own colours, glowing behind its card. */}
                <PhotoGlow
                  photo={heroCar.photo}
                  className="absolute -inset-10 -z-10 opacity-35 blur-3xl saturate-150"
                />
                <ErrorBoundary fallback={null}>
                  <SampleCarCard car={heroCar} />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </section>

        <MakesBand />

        <div className="page-wrap">
          <RecentlyViewed className="pt-8 sm:pt-10" />
        </div>

        {/* Rules between sections run edge to edge, as on every other page. */}
        <div className="border-t border-zinc-900 reveal">
          <div className="page-wrap section-y">
            <BestSellers />
          </div>
        </div>

        <div className="border-t border-zinc-900 reveal">
          <section className="page-wrap section-y">
            <h2 className="section-title mb-6">How do you want to start?</h2>
            {/* A line each, a tap each: the boxes of chips here took two phone
              screens and repeated the best sellers above them. */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {START_POINTS.map((start) => (
                <li key={start.to}>
                  <Link to={start.to} className="choice-tile h-full">
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-white">
                        {start.label}
                      </span>
                      <span className="block text-[13px] text-zinc-400 mt-0.5">{start.note}</span>
                    </span>
                    <span aria-hidden className="text-zinc-500 shrink-0">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-zinc-900 reveal">
          <section className="page-wrap section-y">
            <h2 className="section-title mb-2">Shortlists</h2>
            <p className="text-[15px] text-zinc-400 mb-6 max-w-xl leading-relaxed">
              Ranked picks for common situations, one per model, not every trim on file.
            </p>
            <ErrorBoundary fallback={null}>
              <ShortlistCards limit={6} />
            </ErrorBoundary>
            <Link
              to="/browse#shortlists"
              className="inline-flex items-center min-h-[44px] mt-3 text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400"
            >
              All {Object.keys(COLLECTIONS).length} shortlists →
            </Link>
          </section>
        </div>
      </main>

      <SiteFooter />

      <CompareTray />
      <MobileTabBar />
    </div>
  );
}
