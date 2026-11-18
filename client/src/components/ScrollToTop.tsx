import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** How far down each history entry was scrolled, by location key. */
const positions = new Map<string, number>();

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
  const { pathname, hash, key } = useLocation();
  const navigation = useNavigationType();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => positions.set(key, window.scrollY));
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      cancelAnimationFrame(frame);
    };
  }, [key]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const newPage = lastPath.current !== pathname;
    lastPath.current = pathname;
    // Back or Forward: where the reader left this entry, once the page has
    // drawn enough again to scroll that far (results load after the route).
    const saved = navigation === 'POP' ? positions.get(key) : undefined;
    if (saved != null && saved > 0) {
      let wait = 0;
      let waited = 0;
      const restore = () => {
        const room = document.documentElement.scrollHeight - window.innerHeight;
        if (room >= saved || waited++ > 120) window.scrollTo(0, saved);
        else wait = requestAnimationFrame(restore);
      };
      restore();
      return () => cancelAnimationFrame(wait);
    }
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
  }, [pathname, hash, key, navigation]);

  return null;
}
