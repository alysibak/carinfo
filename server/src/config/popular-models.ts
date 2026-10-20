/**
 * The best-selling models in Canada of recent years, as the home page links
 * their pages ("/models/ford/f-150"). Kept here so a test can check every
 * page still exists (popular-models.test.ts).
 */
export const POPULAR_MODEL_PAGES = [
  { label: 'Ford F-150', path: '/models/ford/f-150' },
  { label: 'Toyota RAV4', path: '/models/toyota/rav4' },
  { label: 'Honda CR-V', path: '/models/honda/cr-v' },
  { label: 'Honda Civic', path: '/models/honda/civic' },
  { label: 'Toyota Corolla', path: '/models/toyota/corolla' },
  { label: 'Toyota Camry', path: '/models/toyota/camry' },
  { label: 'Tesla Model Y', path: '/models/tesla/model-y' },
  { label: 'Ram 1500', path: '/models/ram/1500' },
  { label: 'Hyundai Tucson', path: '/models/hyundai/tucson' },
  { label: 'Mazda CX-5', path: '/models/mazda/cx-5' },
] as const;
