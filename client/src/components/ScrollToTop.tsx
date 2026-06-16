import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the window scroll position to the top whenever the route (pathname)
 * changes. Without this, React Router keeps the previous page's scroll offset,
 * so navigating from a scrolled-down page drops you into the middle of the next.
 *
 * Keyed on pathname only (not search params) so in-page pagination/filtering on
 * /home keeps its own scroll handling.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
