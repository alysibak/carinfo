import { t } from '../i18n';
import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';
import { useMenuStore } from '../stores/menuStore';

const ICON = 'w-6 h-6';
const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 } as const;

const ICONS = {
  search: (
    <svg viewBox="0 0 24 24" className={ICON} {...STROKE} aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20" strokeLinecap="round" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" className={ICON} {...STROKE} aria-hidden>
      <path
        d="M4 8.5V5.5A1.5 1.5 0 0 1 5.5 4h3M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3"
        strokeLinecap="round"
      />
      <path d="M7.5 12h9" strokeLinecap="round" />
    </svg>
  ),
  compare: (
    <svg viewBox="0 0 24 24" className={ICON} {...STROKE} aria-hidden>
      <rect x="3.5" y="5" width="7" height="14" />
      <rect x="13.5" y="5" width="7" height="14" />
      <path d="M5.5 9h3M15.5 9h3M5.5 12h3M15.5 12h3" strokeLinecap="round" />
    </svg>
  ),
  garage: (
    <svg viewBox="0 0 24 24" className={ICON} {...STROKE} aria-hidden>
      <path d="M3.5 10L12 4l8.5 6v10h-17z" strokeLinejoin="round" />
      <path d="M7.5 20v-6h9v6M7.5 17h9" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" className={ICON} {...STROKE} aria-hidden>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" strokeLinecap="round" />
    </svg>
  ),
};

function Count({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className="absolute -top-1 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-accent text-accent-ink text-[11px] font-bold tabular-nums leading-none"
    >
      {count}
    </span>
  );
}

const TAB =
  'relative flex flex-col items-center justify-center gap-1 h-full text-[11px] font-medium tracking-wide transition-colors active:bg-white/5 focus:outline-hidden focus-visible:bg-white/10';

function Tab({
  to,
  label,
  icon,
  count = 0,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  count?: number;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${TAB} active:bg-white/5 ${isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`
      }
    >
      {({ isActive }) => (
        <>
          {/* The page you are on, marked along the bar's top edge. */}
          <span
            aria-hidden
            className={`absolute top-0 inset-x-5 h-0.5 bg-accent transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
          <span className="relative">
            {icon}
            <Count count={count} />
          </span>
          {/* Named by what it shows, the count after the word: an aria-label put
              the count first, and a name must hold the visible label. */}
          <span>
            {label}
            {count > 0 && <span className="sr-only">, {count}</span>}
          </span>
        </>
      )}
    </NavLink>
  );
}

/**
 * The site's places along the foot of a phone's screen, where a thumb rests:
 * the menu button in the top corner was a stretch for one hand. Shown on
 * phones and tablets held upright; on a wide screen the header's links do the
 * same, and on a phone held sideways (too short for a bar) the header's menu.
 */
export default function MobileTabBar() {
  const compared = useCarStore((s) => s.comparedCars.length);
  const saved = useGarageStore((s) => s.cars.length);
  const menuOpen = useMenuStore((s) => s.open);
  const toggleMenu = useMenuStore((s) => s.toggle);
  const setMenuOpen = useMenuStore((s) => s.setOpen);
  return (
    <nav
      aria-label="Main"
      className="tabbar-shown:block hidden fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      onClick={(e) => {
        // A tab other than More closes the menu on its way.
        if ((e.target as Element).closest('a')) setMenuOpen(false);
      }}
    >
      <ul className="grid grid-cols-5 h-[3.6rem] max-w-xl mx-auto">
        <li>
          <Tab to="/home" label={t('Search')} icon={ICONS.search} />
        </li>
        <li>
          {/* The camera is what a phone is for here; Browse is under More. */}
          <Tab to="/vin" label={t('Scan')} icon={ICONS.scan} />
        </li>
        <li>
          <Tab to="/compare" label={t('Compare')} icon={ICONS.compare} count={compared} />
        </li>
        <li>
          <Tab to="/garage" label={t('Garage')} icon={ICONS.garage} count={saved} />
        </li>
        <li>
          <button
            type="button"
            aria-expanded={menuOpen}
            onClick={toggleMenu}
            className={`${TAB} w-full ${menuOpen ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
          >
            {ICONS.more}
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
