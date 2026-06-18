import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';

interface NavLinkItem {
  to: string;
  label: string;
  badge?: number;
}

const NAV_LINKS: NavLinkItem[] = [
  { to: '/browse', label: 'Browse' },
  { to: '/home', label: 'Search' },
  { to: '/value-matrix', label: 'Matrix' },
  { to: '/vin', label: 'VIN' },
  { to: '/garage', label: 'Garage' },
  { to: '/compare', label: 'Compare' },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 text-[10px] font-semibold bg-white text-black px-1.5 py-0.5 rounded-full">
      {count}
    </span>
  );
}

interface SiteHeaderProps {
  /** Extra content on the right (e.g. CTA button) — shown beside menu on mobile */
  trailing?: React.ReactNode;
  /** Landing uses transparent header until scroll */
  transparentUntilScroll?: boolean;
}

export default function SiteHeader({ trailing, transparentUntilScroll = false }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const comparedCount = useCarStore((s) => s.comparedCars.length);
  const garageCount = useGarageStore((s) => s.cars.length);

  const badgeFor = (to: string) => {
    if (to === '/garage') return garageCount;
    if (to === '/compare') return comparedCount;
    return 0;
  };

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

  const showBorder = !transparentUntilScroll || scrolled;

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        showBorder
          ? 'border-b border-zinc-900 bg-black/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="page-wrap py-3.5 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-white hover:text-zinc-300 transition-colors shrink-0"
          onClick={() => setMenuOpen(false)}
        >
          CarInfo
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                  isActive ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'
                }`
              }
            >
              {item.label}
              <Badge count={badgeFor(item.to)} />
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {trailing}
          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-zinc-400 hover:text-white transition-colors"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 top-[52px] z-40 bg-black/95 backdrop-blur-sm">
          <nav className="page-wrap py-6 flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3.5 rounded-lg text-base font-medium transition-colors ${
                    isActive ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:bg-zinc-950 hover:text-white'
                  }`
                }
              >
                {item.label}
                <Badge count={badgeFor(item.to)} />
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
