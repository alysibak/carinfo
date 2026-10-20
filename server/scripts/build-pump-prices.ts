/**
 * Write src/config/pump-prices.ts from Statistics Canada's monthly pump prices
 * (table 18-10-0001-01), as fetch-public-data.ts downloads them: each city's
 * average self-serve regular, premium and diesel over the last twelve months
 * on file, and the latest month's. The site's fuel costs are figured at the
 * twelve-month average, which a month's spike or dip does not swing.
 *
 * The prices are a TypeScript module, not a data file, because the browser's
 * cost calculator uses them too.
 *
 * Usage: tsx scripts/build-pump-prices.ts <folder with the public data>
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const folder = resolve(process.argv[2] ?? join(scriptDir, '..', 'data', 'public'));
const OUT = resolve(scriptDir, '..', 'src', 'config', 'pump-prices.ts');
const MONTHS = 12;

interface Row {
  month: string;
  place: string;
  product: string;
  unit: string;
  value: number;
}

const PRODUCTS = {
  regular: /^Regular unleaded gasoline at self service/i,
  premium: /^Premium unleaded gasoline at self service/i,
  diesel: /^Diesel fuel at self service/i,
} as const;
type Product = keyof typeof PRODUCTS;

const { rows } = JSON.parse(readFileSync(join(folder, 'fuel-prices.json'), 'utf8')) as {
  rows: Row[];
};
const priced = rows.filter((row) => row.unit === 'Cents per litre' && row.value > 0);
const months = [...new Set(priced.map((row) => row.month))].sort();
const window = months.slice(-MONTHS);
const latest = window.at(-1)!;
if (window.length < MONTHS) throw new Error(`Only ${window.length} months of prices on file`);

const dollars = (cents: number) => Math.round(cents * 10) / 1000;

const cities: Record<
  string,
  Partial<Record<Product, number>> & { latest: Partial<Record<Product, number>> }
> = {};
for (const place of [...new Set(priced.map((row) => row.place))].sort()) {
  const city: (typeof cities)[string] = { latest: {} };
  for (const [product, pattern] of Object.entries(PRODUCTS) as Array<[Product, RegExp]>) {
    const values = priced.filter(
      (row) => row.place === place && pattern.test(row.product) && window.includes(row.month),
    );
    // A year's average only from a full year of months.
    if (values.length === MONTHS) {
      city[product] = dollars(values.reduce((sum, row) => sum + row.value, 0) / MONTHS);
    }
    const last = values.find((row) => row.month === latest);
    if (last) city.latest[product] = dollars(last.value);
  }
  if (city.regular) cities[place] = city;
}

const body = `/**
 * Statistics Canada's monthly average retail pump prices, self-serve, in
 * dollars per litre: each city's average over ${window[0]} to ${latest}, and
 * ${latest} alone. Table 18-10-0001-01, under the Statistics Canada Open
 * Licence. Written by scripts/build-pump-prices.ts; do not edit by hand.
 */
export const PUMP_PRICES = ${JSON.stringify(
  {
    table: '18-10-0001-01',
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101',
    from: window[0],
    through: latest,
    cities,
  },
  null,
  2,
)} as const;

export type PumpPriceCity = keyof typeof PUMP_PRICES.cities;
`;
writeFileSync(OUT, body);
console.log(
  `Pump prices: ${Object.keys(cities).length} cities, ${window[0]} to ${latest}; Toronto regular $${cities['Toronto, Ontario']?.regular}/L`,
);
