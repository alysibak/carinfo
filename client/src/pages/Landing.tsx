import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SearchBar from '../components/SearchBar';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import BestSellers from '../components/BestSellers';
import RecentlyViewed from '../components/RecentlyViewed';
import { usePageMeta } from '../utils/pageMeta';
import CompareTray from '../components/CompareTray';
import MobileTabBar from '../components/MobileTabBar';
import { useCarStore } from '../stores/carStore';
import { msg, t } from '../i18n';
import { useLastSearchStore } from '../stores/lastSearchStore';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

/**
 * The three ways in, by where the visitor is: knowing the car, still
 * choosing, or standing beside one for sale. Each opens its own place, and
 * the links under it go further. Six parallel starts sat two screens down,
 * under a stats row, a sample car and a banner of makes.
 */
const DOORS = [
  {
    title: msg('I know the car'),
    note: msg('Type it in the search box, or pick it from every make, A to Z'),
    to: '/makes',
    more: [] as Array<{ to: string; label: string }>,
  },
  {
    title: msg('Help me choose'),
    note: msg('Three questions: what it carries, what it runs on, how new'),
    to: '/find',
    more: [
      { to: '/browse', label: msg('By situation, body or year') },
      { to: '/browse#shortlists', label: msg('Shortlists') },
    ],
  },
  {
    title: msg('I’m looking at one for sale'),
    note: msg('Scan or type its VIN: what it is, and its recalls, complaints and crash rating'),
    to: '/vin',
    more: [] as Array<{ to: string; label: string }>,
  },
];

export default function Landing() {
  const lastSearch = useLastSearchStore((state) => state.search);
  const lastSearchLabel = useLastSearchStore((state) => state.label);
  usePageMeta(
    t('Compare cars with facts you can check'),
    t(
      'Look up 35,000+ versions of cars since 1995: fuel use and range from official EPA tests, NHTSA crash ratings when on file, and rated power, in Canadian units, each marked with its source.',
    ),
  );
  const [heroQuery, setHeroQuery] = useState('');
  const navigate = useNavigate();

  // Links to the old 3-question quiz land on its successor.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('quiz') === '1') {
      navigate('/find', { replace: true });
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

  return (
    <div className={`min-h-screen bg-black text-white ${trayPad}`}>
      {/* The landing page renders outside Layout, so it carries its own skip
          link and main landmark — without them keyboard users had to tab
          through the whole header, and screen readers found no main region. */}
      <a href="#main-content" className="skip-link">
        {t('Skip to content')}
      </a>

      <SiteHeader transparentUntilScroll />

      <main id="main-content" tabIndex={-1} className="focus:outline-hidden">
        <section className="aurora bg-black border-b border-zinc-900">
          {/* A fine grid under the light, fading out toward the edges. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(ellipse_75%_65%_at_40%_35%,#000_25%,transparent_80%)]"
          />
          <div className="page-wrap pt-10 pb-12 md:pt-16 md:pb-16 lg:pt-24 lg:pb-24 grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-14 items-center">
            <div className="max-w-2xl min-w-0">
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400 mb-6 animate-hero-rise">
                <span aria-hidden className="h-px w-10 bg-accent" />
                {t('Public records, in plain words')}
              </p>
              {/* The promise, not the brand: the header already says CarInfo. */}
              <h1 className="display-text text-[2.6rem] sm:text-6xl lg:text-[5rem] pb-2 mb-5 animate-hero-rise [animation-delay:30ms]">
                {t('Compare cars with facts you can check')}
              </h1>
              <p className="text-base md:text-lg text-zinc-300 leading-relaxed mb-7 md:mb-9 max-w-xl animate-hero-rise [animation-delay:60ms]">
                {t(
                  'Any car or truck since 1995: its recalls in Canada, owners’ complaints, crash ratings, fuel use and what it costs to run where you live. Every figure says where it came from.',
                )}
              </p>

              <div className="animate-hero-rise [animation-delay:80ms]">
                <SearchBar
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={handleHeroSearch}
                  size="hero"
                  placeholder={t('Make, model, or VIN')}
                  siteSearch
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="text-zinc-400">{t('A 17-character VIN works too.')}</span>
                  {lastSearch && lastSearchLabel && (
                    <Link
                      to={`/home${lastSearch}`}
                      className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-600 min-h-[44px] inline-flex items-center"
                    >
                      {t('Your last search: {label}', { label: lastSearchLabel })}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Three doors, where the eye goes after the search box. */}
            <nav
              aria-label={t('Where to start')}
              className="min-w-0 animate-hero-rise [animation-delay:100ms]"
            >
              <ul className="grid gap-3">
                {DOORS.map((door) => (
                  <li key={door.to}>
                    <Link to={door.to} className="choice-tile py-4">
                      <span className="min-w-0">
                        <span className="block text-[17px] font-semibold text-white">
                          {t(door.title)}
                        </span>
                        <span className="block text-[13px] text-zinc-400 mt-1 leading-snug">
                          {t(door.note)}
                        </span>
                      </span>
                      <span aria-hidden className="text-zinc-500 shrink-0">
                        →
                      </span>
                    </Link>
                    {door.more.length > 0 && (
                      <p className="flex flex-wrap gap-x-5 px-4 pt-1 text-[13px]">
                        {door.more.map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            className="inline-flex items-center min-h-[40px] text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400"
                          >
                            {t(link.label)}
                          </Link>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        <div className="page-wrap">
          <RecentlyViewed className="pt-8 sm:pt-10" />
        </div>

        {/* Rules between sections run edge to edge, as on every other page. */}
        <div className="border-t border-zinc-900 reveal">
          <div className="page-wrap section-y">
            <BestSellers />
          </div>
        </div>
      </main>

      <SiteFooter />

      <CompareTray />
      <MobileTabBar />
    </div>
  );
}
