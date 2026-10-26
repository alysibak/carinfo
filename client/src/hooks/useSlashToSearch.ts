import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Where a "/" lands: the page's own search box, the one marked as the site's search. */
export const SITE_SEARCH_ATTR = 'data-site-search';

/** Typing in a field, a "/" is a character, not a shortcut. */
function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * "/" from anywhere goes to the search box, as on many sites: the page's own
 * where it has one, or the search page's.
 */
export function useSlashToSearch(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || typingIn(event.target)) return;
      // Not while a dialog is open over the page.
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      const box = document.querySelector<HTMLInputElement>(`input[${SITE_SEARCH_ATTR}]`);
      if (box) {
        box.focus();
        box.select();
        return;
      }
      navigate('/home', { state: { focusSearch: true } });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);
}
