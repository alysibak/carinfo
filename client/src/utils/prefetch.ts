import * as api from '../services/api';
import { useRegionStore } from '../stores/regionStore';
import type { CarSpecs } from '../types/car.types';
import { PAGE_PHOTO_SIZES, photoImageAttributes } from './carImages';

/**
 * A page's data asked for while its code is still on the way. The car and
 * model pages load as their own chunks and only then asked for the car: on a
 * slow phone connection the request waited most of a second for code it
 * does not need. The entry chunk now starts it, and the page takes it.
 */
const started = new Map<string, Promise<unknown>>();

function prefetch(key: string, load: () => Promise<unknown>): void {
  if (started.has(key)) return;
  const request = load();
  // The page reports a failure when it takes the request; one never taken
  // (the visitor moved on first) must not surface as unhandled.
  request.catch(() => {});
  started.set(key, request);
}

/** The request started for this key, once: a later visit asks afresh. */
export function takePrefetched<T>(key: string): Promise<T> | undefined {
  const request = started.get(key);
  started.delete(key);
  return request as Promise<T> | undefined;
}

export const dashboardKey = (id: string, region: string) => `dashboard:${id}:${region}`;
export const modelKey = (make: string, model: string) => `model:${make}/${model}`;

/** Commons' resized photos, which the car and model pages open with. */
const PHOTO_ORIGIN = 'https://thumb.wikimedia.org';

function preconnect(origin: string) {
  if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  document.head.appendChild(link);
}

/**
 * The page's photo, the largest thing on it, fetched as soon as the data
 * names it rather than once the page's code has drawn it.
 */
function preloadPhoto(photo: CarSpecs['photo']) {
  const image = photoImageAttributes(photo, PAGE_PHOTO_SIZES);
  if (!image) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = image.src;
  if (image.srcSet) link.setAttribute('imagesrcset', image.srcSet);
  if (image.sizes) link.setAttribute('imagesizes', image.sizes);
  link.setAttribute('fetchpriority', 'high');
  link.referrerPolicy = 'no-referrer';
  document.head.appendChild(link);
}

/** A head start is never worth breaking the page over. */
function whenSafe(step: () => void) {
  try {
    step();
  } catch {
    // The page fetches the photo itself.
  }
}

/** Starts the data request of the page this address opens, where it has one. */
export function prefetchForPath(pathname: string): void {
  try {
    const car = /^\/car\/([^/]+)\/?$/.exec(pathname);
    if (car) {
      const id = decodeURIComponent(car[1]);
      const region = useRegionStore.getState().region;
      preconnect(PHOTO_ORIGIN);
      prefetch(dashboardKey(id, region), () =>
        api.getCarDashboard(id, region).then((found) => {
          whenSafe(() => preloadPhoto(found.car.photo));
          return found;
        }),
      );
      return;
    }
    const model = /^\/models\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
    if (model) {
      const [make, name] = [decodeURIComponent(model[1]), decodeURIComponent(model[2])];
      preconnect(PHOTO_ORIGIN);
      prefetch(modelKey(make, name), () =>
        api.getModelOverview(make, name).then((found) => {
          whenSafe(() => preloadPhoto(found.lead.photo));
          return found;
        }),
      );
    }
  } catch {
    // A malformed address: the page itself says so.
  }
}
