import { Link, Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import CompareTray from './CompareTray';
import VisitCounter from './VisitCounter';
import { useCarStore } from '../stores/carStore';
import { regionName, useRegionStore } from '../stores/regionStore';

export default function Layout() {
  const location = useLocation();
  const compareCount = useCarStore((s) => s.comparedCars.length);
  const regionLabel = regionName(useRegionStore((s) => s.region));
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

      {/* At least one screen tall, so the footer starts below the fold. While a
          page loads its data the footer used to sit on screen and then jump
          down when content arrived: most of the dossier's layout shift. */}
      <main
        id="main-content"
        className="flex-1 min-h-[calc(100svh-var(--header-height))]"
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <footer className="border-t border-zinc-900 py-6 mt-auto">
        <div className="page-wrap text-center text-xs text-zinc-400 leading-relaxed space-y-2 px-4">
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
            <Link
              to="/methodology"
              className="text-zinc-400 hover:text-white underline underline-offset-2"
            >
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
