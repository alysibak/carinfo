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
 * - Saved cars: once someone has saved a car, the garage's and the car
 *   page's code, and each saved car's page data and records as the app lists
 *   them, refreshed whenever the list changes. Those answers stand in only
 *   when the network fails; the network's are always used when it answers.
 * - The rest of the API: never touched. The page says when it cannot be reached.
 */
const BUILD = { version: 'dev', shell: [], vin: [], garage: [], ocr: '/ocr' };

const SHELL = `carinfo-shell-${BUILD.version}`;
const READER = 'carinfo-ocr';
const VERSIONS = 'carinfo-versions';
const DATA = 'carinfo-saved-cars';
/** A saved car's page data or records: what its page and the garage ask for. */
const SAVED_CAR_DATA = /^\/api\/cars\/[^/]+\/(dashboard|records)$/;
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

self.addEventListener('message', (event) => {
  // The VIN page, on opening: keep its code, camera included, for a lot with no signal.
  if (event.data?.type === 'keep-vin-page') event.waitUntil(keepFiles(BUILD.vin));
  // The saved cars, as the list changes: the pages' code, and each car's data
  // fetched now, dropping cars no longer saved.
  if (event.data?.type === 'keep-garage') event.waitUntil(keepGarage(event.data.data ?? []));
});

async function keepFiles(files) {
  const cache = await caches.open(SHELL);
  for (const file of files) if (!(await caches.match(file, ANY_VARY))) await cache.add(file);
}

async function keepGarage(urls) {
  const wanted = urls.filter((url) => SAVED_CAR_DATA.test(new URL(url, self.location).pathname));
  const data = await caches.open(DATA);
  const keep = new Set(wanted.map((url) => new URL(url, self.location).href));
  for (const request of await data.keys()) if (!keep.has(request.url)) await data.delete(request);
  if (!wanted.length) return;
  await keepFiles(BUILD.garage).catch(() => {});
  for (const url of wanted) {
    const response = await fetch(url).catch(() => null);
    if (response?.status === 200) await data.put(url, response);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    if (SAVED_CAR_DATA.test(url.pathname)) event.respondWith(savedCarData(request, event));
    return;
  }
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

/**
 * The network's answer, which also refreshes a saved car's stored copy; with
 * no network, the stored copy: for this region and distance if it has one,
 * else the car's under another, better than nothing on a lot.
 */
async function savedCarData(request, event) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const copy = response.clone();
      event.waitUntil(
        caches.open(DATA).then(async (data) => {
          if (await data.match(request, ANY_VARY)) await data.put(request, copy);
        }),
      );
    }
    return response;
  } catch (error) {
    const data = await caches.open(DATA);
    const stored =
      (await data.match(request, ANY_VARY)) ??
      (await data.match(request, { ...ANY_VARY, ignoreSearch: true }));
    if (stored) return stored;
    throw error;
  }
}

/** The shell's own files from the store, anything else from the network. */
async function stored(request) {
  return (await caches.match(request, ANY_VARY)) ?? fetch(request);
}
