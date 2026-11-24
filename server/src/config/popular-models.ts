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
    label: 'Small SUVs',
    paths: ['/models/toyota/corolla-cross', '/models/honda/hr-v', '/models/subaru/crosstrek'],
  },
  {
    label: 'Three-row SUVs',
    paths: ['/models/toyota/highlander', '/models/honda/pilot', '/models/kia/telluride'],
  },
  {
    label: 'Minivans',
    paths: ['/models/toyota/sienna', '/models/honda/odyssey', '/models/chrysler/pacifica'],
  },
  {
    label: 'Pickups',
    paths: ['/models/ford/f-150', '/models/chevrolet/silverado', '/models/ram/1500'],
  },
  {
    label: 'Midsize pickups',
    paths: ['/models/toyota/tacoma', '/models/ford/ranger', '/models/chevrolet/colorado'],
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

/**
 * Other pairs shoppers weigh against each other, each a page of its own
 * ("/compare/toyota-rav4-vs-subaru-forester") beside the match-ups' pairs.
 * Both models current, and with a model year in common.
 */
export const HEAD_TO_HEAD: ReadonlyArray<readonly [string, string]> = [
  // Small SUVs
  ['/models/hyundai/kona', '/models/kia/seltos'],
  ['/models/subaru/crosstrek', '/models/mazda/cx-30'],
  ['/models/honda/hr-v', '/models/mazda/cx-30'],
  ['/models/chevrolet/trax', '/models/hyundai/kona'],
  ['/models/nissan/kicks', '/models/hyundai/venue'],
  ['/models/nissan/kicks', '/models/chevrolet/trax'],
  ['/models/volkswagen/taos', '/models/honda/hr-v'],
  // Compact SUVs
  ['/models/toyota/rav4', '/models/subaru/forester'],
  ['/models/toyota/rav4', '/models/hyundai/tucson'],
  ['/models/toyota/rav4', '/models/nissan/rogue'],
  ['/models/toyota/rav4', '/models/ford/escape'],
  ['/models/toyota/rav4', '/models/volkswagen/tiguan'],
  ['/models/toyota/rav4', '/models/kia/sportage'],
  ['/models/honda/cr-v', '/models/hyundai/tucson'],
  ['/models/honda/cr-v', '/models/subaru/forester'],
  ['/models/honda/cr-v', '/models/chevrolet/equinox'],
  ['/models/honda/cr-v', '/models/nissan/rogue'],
  ['/models/mazda/cx-5', '/models/subaru/forester'],
  ['/models/mazda/cx-50', '/models/toyota/rav4'],
  ['/models/mitsubishi/outlander', '/models/nissan/rogue'],
  ['/models/subaru/outback', '/models/toyota/rav4'],
  // Midsize and three-row SUVs
  ['/models/kia/telluride', '/models/hyundai/palisade'],
  ['/models/hyundai/santa-fe', '/models/kia/sorento'],
  ['/models/hyundai/santa-fe', '/models/toyota/highlander'],
  ['/models/kia/sorento', '/models/mazda/cx-90'],
  ['/models/ford/explorer', '/models/toyota/highlander'],
  ['/models/toyota/grand-highlander', '/models/kia/telluride'],
  ['/models/mazda/cx-90', '/models/kia/telluride'],
  ['/models/subaru/ascent', '/models/honda/pilot'],
  ['/models/chevrolet/traverse', '/models/honda/pilot'],
  ['/models/volkswagen/atlas', '/models/honda/pilot'],
  ['/models/nissan/pathfinder', '/models/honda/pilot'],
  ['/models/chevrolet/tahoe', '/models/ford/expedition'],
  ['/models/toyota/sequoia', '/models/chevrolet/tahoe'],
  // Minivans
  ['/models/kia/carnival', '/models/toyota/sienna'],
  ['/models/honda/odyssey', '/models/kia/carnival'],
  ['/models/chrysler/grand-caravan', '/models/kia/carnival'],
  // Pickups
  ['/models/toyota/tacoma', '/models/nissan/frontier'],
  ['/models/honda/ridgeline', '/models/toyota/tacoma'],
  ['/models/jeep/gladiator', '/models/toyota/tacoma'],
  ['/models/ford/maverick', '/models/hyundai/santa-cruz'],
  ['/models/ford/maverick', '/models/toyota/tacoma'],
  ['/models/toyota/tundra', '/models/ford/f-150'],
  ['/models/toyota/tundra', '/models/chevrolet/silverado'],
  ['/models/chevrolet/silverado', '/models/gmc/sierra'],
  // Cars
  ['/models/honda/civic', '/models/mazda/3'],
  ['/models/toyota/corolla', '/models/mazda/3'],
  ['/models/hyundai/elantra', '/models/kia/k4'],
  ['/models/honda/civic', '/models/volkswagen/jetta'],
  ['/models/toyota/corolla', '/models/nissan/sentra'],
  ['/models/honda/civic', '/models/subaru/impreza'],
  ['/models/toyota/camry', '/models/nissan/altima'],
  ['/models/toyota/camry', '/models/kia/k5'],
  // Electric
  ['/models/tesla/model-3', '/models/hyundai/ioniq-6'],
  ['/models/tesla/model-3', '/models/polestar/2'],
  ['/models/tesla/model-y', '/models/ford/mustang-mach-e'],
  ['/models/tesla/model-y', '/models/chevrolet/equinox-ev'],
  ['/models/tesla/model-y', '/models/volkswagen/id-4'],
  ['/models/hyundai/ioniq-5', '/models/volkswagen/id-4'],
  ['/models/chevrolet/equinox-ev', '/models/hyundai/ioniq-5'],
  ['/models/kia/ev9', '/models/hyundai/ioniq-9'],
  ['/models/kia/ev9', '/models/kia/telluride'],
  // Luxury
  ['/models/bmw/3-series', '/models/mercedes-benz/c-class'],
  ['/models/tesla/model-3', '/models/bmw/3-series'],
  ['/models/audi/a4', '/models/bmw/3-series'],
  ['/models/bmw/x3', '/models/mercedes-benz/glc-class'],
  ['/models/audi/q5', '/models/bmw/x3'],
  ['/models/genesis/gv70', '/models/bmw/x3'],
  ['/models/bmw/x5', '/models/mercedes-benz/gle-class'],
  ['/models/bmw/x5', '/models/audi/q7'],
  ['/models/lexus/rx', '/models/bmw/x5'],
  ['/models/lexus/rx', '/models/acura/mdx'],
  ['/models/lexus/nx', '/models/acura/rdx'],
  ['/models/lexus/nx', '/models/lexus/rx'],
  ['/models/volvo/xc60', '/models/audi/q5'],
  // Fun and off-road
  ['/models/jeep/wrangler', '/models/ford/bronco'],
  ['/models/toyota/4runner', '/models/jeep/wrangler'],
  ['/models/toyota/gr-86', '/models/subaru/brz'],
  ['/models/mazda/mx-5', '/models/toyota/gr-86'],
];
