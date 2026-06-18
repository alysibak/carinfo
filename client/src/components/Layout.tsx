import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';

export default function Layout() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-900 py-8 mt-auto">
        <div className="page-wrap text-center text-xs text-zinc-500 leading-relaxed">
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
