import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the window scroll position to the top whenever the route (pathname)
 * changes. Without this, React Router keeps the previous page's scroll offset,
 * so navigating from a scrolled-down page drops you into the middle of the next.
 *
 * Keyed on pathname only (not search params) so in-page pagination/filtering on
 * /home keeps its own scroll handling. A link to a section of another page
 * ("/browse#shortlists") lands on the section once the page has drawn it.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const newPage = lastPath.current !== pathname;
    lastPath.current = pathname;
    if (newPage) window.scrollTo(0, 0);
    if (!newPage || !hash) return;
    // The page may still be loading its code or data: look for a moment.
    const id = decodeURIComponent(hash.slice(1));
    let frame = 0;
    let tries = 0;
    const find = () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView();
      else if (tries++ < 120) frame = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}
