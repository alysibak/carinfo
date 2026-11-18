import { Suspense, lazy } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import MobileTabBar from './MobileTabBar';
import ErrorBoundary from './ErrorBoundary';
import { useCarStore } from '../stores/carStore';
import { useOnline } from '../hooks/useOnline';
import { t } from '../i18n';

// Not on the first load: the footer starts below the fold (main is a screen
// tall), and the tray shows only once a car is being compared. Neither moves
// anything on screen as it arrives.
const SiteFooter = lazy(() => import('./SiteFooter'));
const CompareTray = lazy(() => import('./CompareTray'));

export default function Layout() {
  const location = useLocation();
  const compareCount = useCarStore((s) => s.comparedCars.length);
  const online = useOnline();
  // Room at the foot for the compare tray on a wide screen, and for the tab
  // bar where it shows instead.
  const trayPad =
    compareCount > 0 && location.pathname !== '/compare'
      ? 'pb-[max(var(--tabbar-height),calc(4.25rem+env(safe-area-inset-bottom)))] tabbar-shown:pb-(--tabbar-height)'
      : location.pathname.startsWith('/car/')
        ? // And for the car page's action bar over the tab bar.
          'pb-(--tabbar-height) tabbar-shown:pb-[calc(var(--tabbar-height)+3.5rem)]'
        : 'pb-(--tabbar-height)';

  return (
    <div className={`min-h-screen bg-black text-white flex flex-col ${trayPad}`}>
      <a href="#main-content" className="skip-link">
        {t('Skip to content')}
      </a>
      <SiteHeader />
      {/* The VIN page says it for itself. */}
      {!online && !location.pathname.startsWith('/vin') && <OfflineBar />}

      {/* At least one screen tall, so the footer starts below the fold. While a
          page loads its data the footer used to sit on screen and then jump
          down when content arrived: most of the dossier's layout shift. */}
      <main
        id="main-content"
        // Each page fades in as it arrives, its loading state included.
        className="flex-1 min-h-[calc(100svh-var(--header-height))] [&>*]:animate-page-in motion-reduce:[&>*]:animate-none"
        tabIndex={-1}
      >
        {/* The header and footer stay while a page's code loads: a visit
            straight to a car page used to show a spinner in place of
            everything, header included. */}
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Each on its own: the tray's code arriving never blanks the footer. */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </ErrorBoundary>
      {compareCount > 0 && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <CompareTray />
          </Suspense>
        </ErrorBoundary>
      )}
      <MobileTabBar />
    </div>
  );
}

/** No connection: most pages need one; the VIN page and its camera do not. */
function OfflineBar() {
  return (
    <p
      role="status"
      className="border-b border-amber-900/60 bg-zinc-950 px-4 py-2 text-center text-sm text-amber-200"
    >
      {t('No connection. The VIN page and its camera still work.')}{' '}
      <Link to="/vin" className="font-semibold underline underline-offset-4">
        {t('Open it')}
      </Link>
    </p>
  );
}

function PageLoading() {
  return (
    <div role="status" className="h-0.5 overflow-hidden">
      <span className="sr-only">{t('Loading')}</span>
      <div
        aria-hidden
        className="h-full w-1/4 bg-accent/70 animate-loading-bar motion-reduce:hidden"
      />
    </div>
  );
}
