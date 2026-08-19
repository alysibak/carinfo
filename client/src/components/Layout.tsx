import { Link, Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';

export default function Layout() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />

      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="border-t border-zinc-900 py-8 mt-auto">
        <div className="page-wrap text-center text-xs text-zinc-400 leading-relaxed space-y-2">
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
            <span>Ontario-baseline estimates in CAD</span>
          </p>
          <p>
            <Link to="/methodology" className="text-zinc-400 hover:text-white underline underline-offset-2">
              Methodology &amp; data policy
            </Link>
            <span aria-hidden="true"> · </span>
            <span className="text-zinc-400">Body-type illustrations only, no listing photos</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
