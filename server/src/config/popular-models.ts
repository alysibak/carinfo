/**
 * Canada's ten best-selling vehicles of 2025, by units sold, as The Car Guide
 * (Guide de l'auto) counted them from the makers' reports. Ford's own release
 * gives the same F-Series figure, 138,470. Sales are counted by family ("Ford
 * F-Series" takes in the Super Duty, "Ram 1500/Heavy Duty" both Rams), so
 * each keeps its sales name beside the model page it links.
 *
 * A test checks every page still exists (popular-models.test.ts).
 */
export const BEST_SELLERS = {
  year: 2025,
  source: {
    name: 'The Car Guide',
    url: 'https://www.guideautoweb.com/en/articles/80882/top-10-best-selling-vehicles-in-canada-in-2025',
  },
  models: [
    {
      rank: 1,
      sales: 'Ford F-Series',
      sold: 138470,
      label: 'Ford F-150',
      path: '/models/ford/f-150',
    },
    {
      rank: 2,
      sales: 'Toyota RAV4',
      sold: 75573,
      label: 'Toyota RAV4',
      path: '/models/toyota/rav4',
    },
    { rank: 3, sales: 'GMC Sierra', sold: 59962, label: 'GMC Sierra', path: '/models/gmc/sierra' },
    { rank: 4, sales: 'Honda CR-V', sold: 55987, label: 'Honda CR-V', path: '/models/honda/cr-v' },
    {
      rank: 5,
      sales: 'Chevrolet Silverado',
      sold: 54068,
      label: 'Chevrolet Silverado',
      path: '/models/chevrolet/silverado',
    },
    {
      rank: 6,
      sales: 'Ram 1500 and Heavy Duty',
      sold: 42759,
      label: 'Ram 1500',
      path: '/models/ram/1500',
    },
    {
      rank: 7,
      sales: 'Hyundai Tucson',
      sold: 41840,
      label: 'Hyundai Tucson',
      path: '/models/hyundai/tucson',
    },
    {
      rank: 8,
      sales: 'Nissan Rogue',
      sold: 36034,
      label: 'Nissan Rogue',
      path: '/models/nissan/rogue',
    },
    {
      rank: 9,
      sales: 'Ford Escape',
      sold: 32956,
      label: 'Ford Escape',
      path: '/models/ford/escape',
    },
    {
      rank: 10,
      sales: 'Subaru Crosstrek',
      sold: 32534,
      label: 'Subaru Crosstrek',
      path: '/models/subaru/crosstrek',
    },
  ],
} as const;

/** The best sellers' model pages. */
export const POPULAR_MODEL_PAGES = BEST_SELLERS.models.map(({ label, path }) => ({ label, path }));

/**
 * Other well-known models, as examples of a model page beside the best
 * sellers above them on the home page: examples, not a ranking.
 */
export const EXAMPLE_MODEL_PAGES = [
  { label: 'Honda Civic', path: '/models/honda/civic' },
  { label: 'Toyota Corolla', path: '/models/toyota/corolla' },
  { label: 'Toyota Camry', path: '/models/toyota/camry' },
  { label: 'Tesla Model Y', path: '/models/tesla/model-y' },
  { label: 'Mazda CX-5', path: '/models/mazda/cx-5' },
  { label: 'Toyota Tacoma', path: '/models/toyota/tacoma' },
  { label: 'Kia Sportage', path: '/models/kia/sportage' },
  { label: 'Hyundai Elantra', path: '/models/hyundai/elantra' },
] as const;

/**
 * Rivals shoppers weigh against each other, compared in one tap: each set
 * the class's best sellers or its best-known names, by model page.
 */
export const MATCHUPS = [
  {
    label: 'Compact cars',
    paths: ['/models/honda/civic', '/models/toyota/corolla', '/models/hyundai/elantra'],
  },
  {
    label: 'Compact SUVs',
    paths: ['/models/toyota/rav4', '/models/honda/cr-v', '/models/mazda/cx-5'],
  },
  {
    label: 'More compact SUVs',
    paths: ['/models/hyundai/tucson', '/models/kia/sportage', '/models/nissan/rogue'],
  },
  {
    label: 'Pickups',
    paths: ['/models/ford/f-150', '/models/chevrolet/silverado', '/models/ram/1500'],
  },
  {
    label: 'Midsize sedans',
    paths: ['/models/toyota/camry', '/models/honda/accord', '/models/hyundai/sonata'],
  },
  {
    label: 'Electric SUVs',
    paths: ['/models/tesla/model-y', '/models/hyundai/ioniq-5', '/models/kia/ev6'],
  },
] as const;
