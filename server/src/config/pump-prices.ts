/**
 * Statistics Canada's monthly average retail pump prices, self-serve, in
 * dollars per litre: each city's average over 2025-11 to 2026-10, and
 * 2026-10 alone. Table 18-10-0001-01, under the Statistics Canada Open
 * Licence. Written by scripts/build-pump-prices.ts; do not edit by hand.
 */
export const PUMP_PRICES = {
  table: '18-10-0001-01',
  url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
  from: '2025-11',
  through: '2026-10',
  cities: {
    'Calgary, Alberta': {
      latest: {
        regular: 1.579,
        premium: 1.841,
        diesel: 2.313,
      },
      regular: 1.499,
      premium: 1.758,
      diesel: 1.825,
    },
    Canada: {
      latest: {
        regular: 1.796,
      },
      regular: 1.624,
    },
    'Charlottetown and Summerside, Prince Edward Island': {
      latest: {
        regular: 1.964,
        premium: 2.081,
        diesel: 2.595,
      },
      regular: 1.755,
      premium: 1.871,
      diesel: 2.17,
    },
    'Edmonton, Alberta': {
      latest: {
        regular: 1.555,
        premium: 1.828,
        diesel: 2.287,
      },
      regular: 1.461,
      premium: 1.722,
      diesel: 1.8,
    },
    'Halifax, Nova Scotia': {
      latest: {
        regular: 1.889,
        premium: 2.073,
        diesel: 2.68,
      },
      regular: 1.663,
      premium: 1.785,
      diesel: 2.106,
    },
    'Montréal, Quebec': {
      latest: {
        regular: 1.921,
        premium: 2.19,
        diesel: 2.929,
      },
      regular: 1.756,
      premium: 2.021,
      diesel: 2.295,
    },
    'Ottawa-Gatineau, Ontario part, Ontario/Quebec': {
      latest: {
        regular: 1.728,
        premium: 2.033,
        diesel: 2.598,
      },
      regular: 1.578,
      premium: 1.881,
      diesel: 1.975,
    },
    'Québec, Quebec': {
      latest: {
        regular: 1.904,
        premium: 2.166,
        diesel: 2.896,
      },
      regular: 1.714,
      premium: 1.978,
      diesel: 2.278,
    },
    'Regina, Saskatchewan': {
      latest: {
        regular: 1.789,
        premium: 2.049,
        diesel: 2.491,
      },
      regular: 1.558,
      premium: 1.82,
      diesel: 1.844,
    },
    'Saint John, New Brunswick': {
      latest: {
        regular: 1.865,
        premium: 2.157,
        diesel: 2.672,
      },
      regular: 1.658,
      premium: 1.822,
      diesel: 2.134,
    },
    'Saskatoon, Saskatchewan': {
      latest: {
        regular: 1.745,
        premium: 2.009,
        diesel: 2.459,
      },
      regular: 1.534,
      premium: 1.796,
      diesel: 1.862,
    },
    "St. John's, Newfoundland and Labrador": {
      latest: {
        regular: 2.104,
        premium: 2.162,
        diesel: 2.748,
      },
      regular: 1.79,
      premium: 1.849,
      diesel: 2.164,
    },
    'Thunder Bay, Ontario': {
      latest: {
        regular: 1.837,
        premium: 2.145,
      },
      regular: 1.582,
      premium: 1.885,
    },
    'Toronto, Ontario': {
      latest: {
        regular: 1.79,
        premium: 2.103,
        diesel: 2.555,
      },
      regular: 1.599,
      premium: 1.908,
      diesel: 1.941,
    },
    'Vancouver, British Columbia': {
      latest: {
        regular: 2.069,
        premium: 2.332,
        diesel: 2.859,
      },
      regular: 1.909,
      premium: 2.168,
      diesel: 2.251,
    },
    'Victoria, British Columbia': {
      latest: {
        regular: 1.998,
        premium: 2.266,
        diesel: 2.804,
      },
      regular: 1.867,
      premium: 2.127,
      diesel: 2.189,
    },
    'Whitehorse, Yukon': {
      latest: {
        regular: 1.999,
        premium: 2.134,
        diesel: 2.699,
      },
      regular: 1.799,
      premium: 1.934,
      diesel: 2.041,
    },
    'Winnipeg, Manitoba': {
      latest: {
        regular: 1.73,
        premium: 1.994,
        diesel: 2.493,
      },
      regular: 1.527,
      premium: 1.793,
      diesel: 1.895,
    },
    'Yellowknife, Northwest Territories': {
      latest: {
        regular: 1.803,
        premium: 2.053,
        diesel: 2.236,
      },
      regular: 1.656,
      premium: 1.893,
      diesel: 1.873,
    },
  },
} as const;

export type PumpPriceCity = keyof typeof PUMP_PRICES.cities;
