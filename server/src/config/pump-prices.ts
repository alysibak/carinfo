/**
 * Statistics Canada's monthly average retail pump prices, self-serve, in
 * dollars per litre: each city's average over 2025-10 to 2026-09, and
 * 2026-09 alone. Table 18-10-0001-01, under the Statistics Canada Open
 * Licence. Written by scripts/build-pump-prices.ts; do not edit by hand.
 */
export const PUMP_PRICES = {
  table: '18-10-0001-01',
  url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
  from: '2025-10',
  through: '2026-09',
  cities: {
    'Calgary, Alberta': {
      latest: {
        regular: 1.673,
        premium: 1.936,
        diesel: 2.408,
      },
      regular: 1.472,
      premium: 1.731,
      diesel: 1.751,
    },
    Canada: {
      latest: {
        regular: 1.843,
      },
      regular: 1.589,
    },
    'Charlottetown and Summerside, Prince Edward Island': {
      latest: {
        regular: 2.067,
        premium: 2.173,
        diesel: 2.644,
      },
      regular: 1.713,
      premium: 1.829,
      diesel: 2.088,
    },
    'Edmonton, Alberta': {
      latest: {
        regular: 1.625,
        premium: 1.894,
        diesel: 2.36,
      },
      regular: 1.435,
      premium: 1.694,
      diesel: 1.724,
    },
    'Halifax, Nova Scotia': {
      latest: {
        regular: 1.932,
        premium: 2.102,
        diesel: 2.634,
      },
      regular: 1.62,
      premium: 1.736,
      diesel: 2.014,
    },
    'Montréal, Quebec': {
      latest: {
        regular: 1.984,
        premium: 2.252,
        diesel: 2.871,
      },
      regular: 1.723,
      premium: 1.988,
      diesel: 2.193,
    },
    'Ottawa-Gatineau, Ontario part, Ontario/Quebec': {
      latest: {
        regular: 1.784,
        premium: 2.088,
        diesel: 2.534,
      },
      regular: 1.544,
      premium: 1.847,
      diesel: 1.874,
    },
    'Québec, Quebec': {
      latest: {
        regular: 1.95,
        premium: 2.213,
        diesel: 2.841,
      },
      regular: 1.683,
      premium: 1.946,
      diesel: 2.179,
    },
    'Regina, Saskatchewan': {
      latest: {
        regular: 1.74,
        premium: 2.006,
        diesel: 2.41,
      },
      regular: 1.519,
      premium: 1.78,
      diesel: 1.754,
    },
    'Saint John, New Brunswick': {
      latest: {
        regular: 1.925,
        premium: 2.185,
        diesel: 2.623,
      },
      regular: 1.624,
      premium: 1.772,
      diesel: 2.048,
    },
    'Saskatoon, Saskatchewan': {
      latest: {
        regular: 1.755,
        premium: 2.018,
        diesel: 2.367,
      },
      regular: 1.496,
      premium: 1.757,
      diesel: 1.778,
    },
    "St. John's, Newfoundland and Labrador": {
      latest: {
        regular: 2.137,
        premium: 2.195,
        diesel: 2.683,
      },
      regular: 1.74,
      premium: 1.799,
      diesel: 2.074,
    },
    'Thunder Bay, Ontario': {
      latest: {
        regular: 1.758,
        premium: 2.064,
      },
      regular: 1.537,
      premium: 1.839,
    },
    'Toronto, Ontario': {
      latest: {
        regular: 1.837,
        premium: 2.149,
        diesel: 2.494,
      },
      regular: 1.56,
      premium: 1.868,
      diesel: 1.842,
    },
    'Vancouver, British Columbia': {
      latest: {
        regular: 2.095,
        premium: 2.359,
        diesel: 2.853,
      },
      regular: 1.871,
      premium: 2.129,
      diesel: 2.161,
    },
    'Victoria, British Columbia': {
      latest: {
        regular: 2.1,
        premium: 2.369,
        diesel: 2.783,
      },
      regular: 1.837,
      premium: 2.096,
      diesel: 2.098,
    },
    'Whitehorse, Yukon': {
      latest: {
        regular: 1.996,
        premium: 2.131,
        diesel: 2.495,
      },
      regular: 1.764,
      premium: 1.899,
      diesel: 1.952,
    },
    'Winnipeg, Manitoba': {
      latest: {
        regular: 1.715,
        premium: 1.981,
        diesel: 2.422,
      },
      regular: 1.489,
      premium: 1.755,
      diesel: 1.81,
    },
    'Yellowknife, Northwest Territories': {
      latest: {
        regular: 1.813,
        premium: 2.063,
        diesel: 2.158,
      },
      regular: 1.626,
      premium: 1.861,
      diesel: 1.818,
    },
  },
} as const;

export type PumpPriceCity = keyof typeof PUMP_PRICES.cities;
