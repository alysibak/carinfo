/**
 * Asks the service worker (client/service-worker.js) to keep the VIN page's
 * code, the camera's included, for use with no signal. Sent to the active
 * worker even before it controls the page, so a first visit counts. Nothing
 * where there is no service worker: in development, in tests, in a browser
 * without one.
 */
export function keepVinPageOffline(): void {
  post({ type: 'keep-vin-page' });
}

/**
 * Asks the service worker to keep the garage's and the car page's code, and
 * these saved cars' data (dropping any car no longer listed), so the garage
 * and its cars open with no signal.
 */
export function keepGarageOffline(urls: string[]): void {
  post({ type: 'keep-garage', data: urls });
}

function post(message: { type: string; data?: unknown }): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage(message))
    .catch(() => {});
}
