const STORAGE_KEY = 'carinfo-stale-build-reload';
const LOOP_GUARD_MS = 10_000;

/** The slice of `window` this needs, so tests can supply their own. */
export interface RecoveryHost {
  addEventListener(type: 'vite:preloadError', listener: (event: Event) => void): void;
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>;
  location: Pick<Location, 'reload'>;
  navigator: Pick<Navigator, 'onLine'>;
}

/**
 * Reload once when a route's code fails to load after a deploy.
 *
 * Every deploy renames the hashed chunks. A tab opened before it still holds
 * the old index.html, so its next route change asks for a chunk that no
 * longer exists and the page falls into the error screen. Vite reports that as
 * `vite:preloadError`; a reload fetches the new build and the navigation just
 * works.
 *
 * It never reloads offline (the browser's offline page is worse than ours),
 * nor twice within ten seconds, so a failure a reload cannot fix still reaches
 * the error boundary instead of looping. Without session storage there is no
 * loop guard, so it does nothing.
 */
export function installStaleBuildRecovery(host: RecoveryHost = window): void {
  host.addEventListener('vite:preloadError', (event) => {
    if (!host.navigator.onLine) return;
    const now = Date.now();
    try {
      const last = Number(host.sessionStorage.getItem(STORAGE_KEY)) || 0;
      if (now - last < LOOP_GUARD_MS) return;
      host.sessionStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      return;
    }
    event.preventDefault();
    host.location.reload();
  });
}
