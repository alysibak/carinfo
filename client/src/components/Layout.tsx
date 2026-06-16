import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import { useGarageStore } from '../stores/garageStore';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors px-2 py-1 rounded-md ${
          isActive ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 text-[10px] font-semibold bg-white text-black px-1.5 py-0.5 rounded-full">
      {count}
    </span>
  );
}

export default function Layout() {
  const comparedCarsCount = useCarStore((s) => s.comparedCars.length);
  const garageCount = useGarageStore((s) => s.cars.length);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-black/80 backdrop-blur-md">
        <div className="page-wrap py-3.5 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-semibold tracking-tight hover:opacity-90 transition-opacity">
            CarInfo
          </Link>

          <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto">
            <NavItem to="/browse" label="Browse" />
            <NavItem to="/home" label="Search" />
            <NavItem to="/value-matrix" label="Matrix" />
            <NavItem to="/vin" label="VIN" />
            <NavLink
              to="/garage"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors px-2 py-1 rounded-md whitespace-nowrap ${
                  isActive ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'
                }`
              }
            >
              Garage
              <Badge count={garageCount} />
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors px-2 py-1 rounded-md whitespace-nowrap ${
                  isActive ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'
                }`
              }
            >
              Compare
              <Badge count={comparedCarsCount} />
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-900 py-8 mt-auto">
        <div className="page-wrap text-center text-xs text-zinc-500 leading-relaxed px-4">
          <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
            <span>
              Specs from{' '}
              <a
                href="https://www.fueleconomy.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white underline"
              >
                EPA / FuelEconomy.gov
              </a>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Safety from{' '}
              <a
                href="https://www.nhtsa.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white underline"
              >
                NHTSA
              </a>
            </span>
            <span aria-hidden="true">·</span>
            <span>Cost &amp; value estimates use Ontario-baseline assumptions in CAD</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
