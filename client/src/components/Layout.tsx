import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-xs tracking-[0.3em] uppercase transition-colors ${
          isActive ? 'text-white' : 'text-zinc-500 hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const comparedCarsCount = useCarStore((s) => s.comparedCars.length);
  const garageCount = useGarageStore((s) => s.cars.length);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-zinc-900">
        <div className="px-6 md:px-8 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            <Link to="/" className="group">
              <div className="flex items-baseline gap-3">
                <span className="text-lg md:text-xl font-black tracking-tighter group-hover:tracking-wide transition-all">
                  CARINFO
                </span>
                <span className="hidden md:inline text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
                  Automotive archive
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-5 md:gap-8">
              <NavItem to="/home" label="SEARCH" />
              <NavItem to="/smart-search" label="SMART" />
              <NavItem to="/value-matrix" label="MATRIX" />

              <NavLink
                to="/garage"
                className={({ isActive }) =>
                  `text-xs tracking-[0.3em] uppercase transition-colors ${
                    isActive ? 'text-white' : 'text-zinc-500 hover:text-white'
                  }`
                }
              >
                GARAGE{garageCount > 0 ? ` (${garageCount})` : ''}
              </NavLink>

              <NavLink
                to="/compare"
                className={({ isActive }) =>
                  `text-xs tracking-[0.3em] uppercase transition-colors ${
                    isActive ? 'text-white' : 'text-zinc-500 hover:text-white'
                  }`
                }
              >
                COMPARE{comparedCarsCount > 0 ? ` (${comparedCarsCount})` : ''}
              </NavLink>
            </nav>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}

