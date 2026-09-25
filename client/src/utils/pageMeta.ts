import { useEffect } from 'react';

const DEFAULT_TITLE = 'CarInfo | EPA-verified specs and honest vehicle estimates';
const DEFAULT_DESCRIPTION =
  'Search and compare 35,000+ vehicles with EPA-verified specs, NHTSA safety when available, and clearly labeled Ontario/CAD market estimates.';

/** The path the document was served for; server-rendered tags describe it. */
const INITIAL_PATH = typeof window !== 'undefined' ? window.location.pathname : '';

/**
 * Remove page-specific tags the server rendered (canonical, og:url, JSON-LD,
 * robots noindex) once the SPA has navigated elsewhere. They describe the page
 * the document was served for; left in place they would claim car A's
 * canonical and structured data while showing car B.
 */
function dropServerTagsAfterNavigation(): void {
  if (window.location.pathname === INITIAL_PATH) return;
  document.querySelectorAll('[data-ssr]').forEach((el) => el.remove());
}

/**
 * Keep a page out of search results while it is showing. The static host
 * answers unknown paths with the app shell and a 200, so this tag is how a
 * crawler that renders the page learns it is a "not found".
 */
export function useNoIndex(): void {
  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex';
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);
}

export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    dropServerTagsAfterNavigation();
    const fullTitle = title ? `${title} | CarInfo` : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;
    document.title = fullTitle;
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', desc);
  }, [title, description]);
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION };
