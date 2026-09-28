import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';
import { REGION_OPTIONS, useRegionStore } from '../stores/regionStore';
import AuthHeaderSlot from './AuthHeaderSlot';

interface NavLinkItem {
  to: string;
  label: string;
  badge?: number;
}

// "Guides" opened a page titled "Start from a situation", and the value chart
// was only in the phone menu: the labels now name the pages they open.
const NAV_LINKS: NavLinkItem[] = [
  { to: '/home', label: 'Search' },
  { to: '/browse', label: 'Browse' },
  { to: '/compare', label: 'Compare' },
  { to: '/value-matrix', label: 'Value chart' },
  { to: '/vin', label: 'VIN' },
  { to: '/garage', label: 'Garage' },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 text-xs font-semibold tabular-nums text-accent-ink bg-accent px-1.5 leading-5 rounded-none">
      {count}
    </span>
  );
}

interface SiteHeaderProps {
  trailing?: React.ReactNode;
  transparentUntilScroll?: boolean;
}

export default function SiteHeader({ trailing, transparentUntilScroll = false }: SiteHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const comparedCount = useCarStore((s) => s.comparedCars.length);
  const garageCount = useGarageStore((s) => s.cars.length);
  const region = useRegionStore((s) => s.region);
  const setRegion = useRegionStore((s) => s.setRegion);

  const badgeFor = (to: string) => {
    if (to === '/garage') return garageCount;
    if (to === '/compare') return comparedCount;
    return 0;
  };

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    apply();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', apply);
      return () => window.removeEventListener('resize', apply);
    }
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!transparentUntilScroll) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparentUntilScroll]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const showBorder = !transparentUntilScroll || scrolled;

  const header = (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 transition-colors duration-150 ${
        showBorder
          ? 'border-b border-zinc-800/80 bg-black/92 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="page-wrap py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3">
        <Link
          to="/"
          className="text-sm font-bold uppercase tracking-[0.18em] text-white hover:text-zinc-300 transition-colors shrink-0 min-h-[44px] inline-flex items-center"
          onClick={() => setMenuOpen(false)}
        >
          CarInfo
        </Link>

        <nav className="hidden lg:flex items-center gap-0 min-w-0">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm px-2.5 xl:px-3 min-h-[44px] inline-flex items-center transition-colors border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'text-white border-accent'
                    : 'text-zinc-400 border-transparent hover:text-white'
                }`
              }
            >
              {item.label}
              <Badge count={badgeFor(item.to)} />
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Named on screen: a bare "Ontario" menu said nothing about what it set. */}
          <label className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
            <span>Costs for</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as typeof region)}
              className="bg-transparent border border-zinc-700 text-zinc-200 text-[13px] px-2 py-1.5 focus:outline-none focus:border-accent max-w-[9.5rem]"
              aria-label="Costs for region"
            >
              {REGION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {trailing}
          <div className="hidden sm:block">
            <AuthHeaderSlot />
          </div>
          <button
            type="button"
            className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center -mr-1 text-zinc-400 hover:text-white transition-colors"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );

  // Rendered through a portal rather than inside <header>: the header's
  // backdrop-filter makes it the containing block for fixed-position
  // descendants, which collapsed this panel to the header's own height.
  const mobileMenu =
    menuOpen &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain bg-black"
        style={{ top: 'var(--header-height, 64px)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
      >
        <nav className="page-wrap py-3 flex flex-col divide-y divide-zinc-800 border-t border-zinc-800">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between min-h-[48px] py-3 text-base transition-colors ${
                  isActive ? 'text-white font-semibold' : 'text-zinc-300 hover:text-white'
                }`
              }
            >
              {item.label}
              <Badge count={badgeFor(item.to)} />
            </NavLink>
          ))}
          <div className="py-4">
            <label className="flex flex-col gap-2 text-sm text-zinc-400">
              Costs for (estimates in CAD)
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as typeof region)}
                className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-base px-3 py-2.5 focus:outline-none focus:border-accent"
                aria-label="Costs for region"
              >
                {REGION_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="py-4">
            <AuthHeaderSlot onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="py-4 flex flex-col gap-3 text-sm text-zinc-400">
            <NavLink
              to="/methodology"
              onClick={() => setMenuOpen(false)}
              className="hover:text-white"
            >
              Methodology
            </NavLink>
          </div>
        </nav>
      </div>,
      document.body,
    );

  return (
    <>
      {header}
      {mobileMenu}
    </>
  );
}
