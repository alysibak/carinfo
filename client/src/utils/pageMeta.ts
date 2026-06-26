import { useEffect } from 'react';

const DEFAULT_TITLE = 'CarInfo | EPA-verified specs and honest vehicle estimates';
const DEFAULT_DESCRIPTION =
  'Search and compare 28,000+ vehicles with EPA-verified specs, NHTSA safety when available, and clearly labeled Ontario/CAD market estimates.';

export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
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
