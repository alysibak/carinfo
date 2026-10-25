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
        <Outlet />
      </main>

      <SiteFooter />

      <CompareTray />
    </div>
  );
}
