import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import CompareTray from './CompareTray';
import SiteFooter from './SiteFooter';
import { useCarStore } from '../stores/carStore';

export default function Layout() {
  const location = useLocation();
  const compareCount = useCarStore((s) => s.comparedCars.length);
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
        {/* The header and footer stay while a page's code loads: a visit
            straight to a car page used to show a spinner in place of
            everything, header included. */}
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      <SiteFooter />

      <CompareTray />
    </div>
  );
}

function PageLoading() {
  return (
    <div role="status" className="h-0.5 overflow-hidden">
      <span className="sr-only">Loading</span>
      <div
        aria-hidden
        className="h-full w-1/4 bg-accent/70 animate-loading-bar motion-reduce:hidden"
      />
    </div>
  );
}
