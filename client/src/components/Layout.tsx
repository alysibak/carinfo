import { Link, Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import CompareTray from './CompareTray';
import VisitCounter from './VisitCounter';
import { useCarStore } from '../stores/carStore';
import { useRegionStore } from '../stores/regionStore';

export default function Layout() {
  const location = useLocation();
  const compareCount = useCarStore((s) => s.comparedCars.length);
  const region = useRegionStore((s) => s.region);
  const regionLabel = region === 'british-columbia' ? 'British Columbia' : 'Ontario';
  const trayPad =
    compareCount > 0 && location.pathname !== '/compare'
      ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]'
      : '';

  return (
    <div className={`min-h-screen bg-black text-white flex flex-col ${trayPad}`}>
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
            <span>{regionLabel}-baseline estimates in CAD</span>
          </p>
          <p>
            <Link to="/vin" className="text-zinc-400 hover:text-white underline underline-offset-2">
              VIN lookup
            </Link>
            <span aria-hidden="true"> · </span>
            <Link to="/methodology" className="text-zinc-400 hover:text-white underline underline-offset-2">
              Methodology &amp; data policy
            </Link>
            <span aria-hidden="true"> · </span>
            <span className="text-zinc-400">Body-type illustrations only, no listing photos</span>
          </p>
          <VisitCounter className="text-zinc-500" />
        </div>
      </footer>

      <CompareTray />
    </div>
  );
}
