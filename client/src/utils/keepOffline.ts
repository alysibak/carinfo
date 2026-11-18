/**
 * Asks the service worker (client/service-worker.js) to keep the VIN page's
 * code, the camera's included, for use with no signal. Sent to the active
 * worker even before it controls the page, so a first visit counts. Nothing
 * where there is no service worker: in development, in tests, in a browser
 * without one.
 */
export function keepVinPageOffline(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage({ type: 'keep-vin-page' }))
    .catch(() => {});
}
