/**
 * The service worker: the VIN page and its camera open, and read a VIN, with
 * no signal, as on a dealer's lot. vite.config.ts writes this build's file
 * list over BUILD and serves it as /sw.js; the app registers it in main.tsx.
 *
 * - Pages: the network's, fresh. With no network, or none within four
 *   seconds, the app's shell, which opens any page; the app says what needs a
 *   connection.
 * - Code, styles and fonts (/assets/, named by their content): the shell's
 *   as it installs, the VIN page's once that page asks (it does on opening),
 *   anything else once read. Kept for this build and the one before, so a
 *   tab opened before an update still loads its pages.
 * - The text reader (/ocr/<version>/, about 7 MB): stored once the VIN page
 *   has read it; only this build's version is kept.
 * - The API: never touched. The page says when it cannot be reached.
 */
const BUILD = { version: 'dev', shell: [], vin: [], ocr: '/ocr' };

const SHELL = `carinfo-shell-${BUILD.version}`;
const READER = 'carinfo-ocr';
const VERSIONS = 'carinfo-versions';
const PAGE_WAIT_MS = 4000;
// The page asks for its script and styles with an Origin header the install
// did not send; a server that varies on it would make a stored copy miss.
// Every stored file is named for its content, so any copy will do.
const ANY_VARY = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(BUILD.shell))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const store = await caches.open(VERSIONS);
      const saved = await store.match('/versions');
      const before = saved ? await saved.json().catch(() => []) : [];
      const kept = [...before.filter((version) => version !== BUILD.version), BUILD.version].slice(
        -2,
      );
      await store.put('/versions', new Response(JSON.stringify(kept)));
      for (const name of await caches.keys()) {
        const version = name.startsWith('carinfo-shell-') && name.slice('carinfo-shell-'.length);
        if (version && !kept.includes(version)) await caches.delete(name);
      }
      const reader = await caches.open(READER);
      for (const request of await reader.keys()) {
        if (!new URL(request.url).pathname.startsWith(`${BUILD.ocr}/`))
          await reader.delete(request);
      }
      await self.clients.claim();
    })(),
  );
});

// The VIN page, on opening: keep its code, camera included, for a lot with no signal.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'keep-vin-page') return;
  event.waitUntil(
    caches.open(SHELL).then(async (cache) => {
      for (const file of BUILD.vin)
        if (!(await caches.match(file, ANY_VARY))) await cache.add(file);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') event.respondWith(page(request));
  else if (url.pathname.startsWith(`${BUILD.ocr}/`))
    event.respondWith(kept(request, READER, event));
  else if (url.pathname.startsWith('/assets/')) event.respondWith(kept(request, SHELL, event));
  else event.respondWith(stored(request));
});

/** The network's page unless it is down or slow; then the shell, which opens any page. */
async function page(request) {
  const network = fetch(request).catch(() => null);
  const slow = new Promise((resolve) => setTimeout(resolve, PAGE_WAIT_MS, 'slow'));
  const first = await Promise.race([network, slow]);
  if (first && first !== 'slow') return first;
  const shell = await caches.match('/index.html', ANY_VARY);
  return shell ?? (await network) ?? Response.error();
}

/** A stored copy first; otherwise the network's, stored for next time. */
async function kept(request, cacheName, event) {
  const hit = await caches.match(request, ANY_VARY);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.status === 200) {
    const copy = response.clone();
    event.waitUntil(caches.open(cacheName).then((cache) => cache.put(request, copy)));
  }
  return response;
}

/** The shell's own files from the store, anything else from the network. */
async function stored(request) {
  return (await caches.match(request, ANY_VARY)) ?? fetch(request);
}
