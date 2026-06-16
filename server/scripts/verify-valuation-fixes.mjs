/**
 * Post-fix verification — Parts 5-6. Run after build.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const { estimateMarketValue, effectiveFuelType } = await import('../dist/utils/vehicle-valuation.js');
const { computeOwnershipEconomics, calculateResaleImpact } = await import('../dist/utils/ownership-economics.js');
const { normalizeCarRecord: norm } = await import('../dist/utils/car-normalize.js');
const { displayTrimLabel } = await import('../dist/utils/trim-label.js');
const { inferEffectiveFuelType } = await import('../dist/utils/fuel-type-inference.js');

const data = JSON.parse(fs.readFileSync(path.join(root, 'data/cars.json'), 'utf8'));
const cars = data.cars;

const SAMPLE = [
  ['Economy sedan', (c) => c.make === 'Toyota' && c.model === 'Corolla' && c.year === 2020],
  ['Economy SUV', (c) => c.make === 'Toyota' && c.model === 'RAV4' && c.year === 2020 && c.engine.fuelType === 'gasoline'],
  ['Macan 2023', (c) => c.make === 'Porsche' && c.model === 'Macan' && c.year === 2023],
  ['Cayenne e-Hybrid', (c) => c.id === 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8'],
  ['Camry XSE 2018', (c) => c.id === 'toyota-camry-xse-2018-camry-automatic-s8'],
  ['BEV Model 3', (c) => c.make === 'Tesla' && c.model.includes('Model 3 Long Range') && c.year === 2022],
];

console.log('\n=== BEFORE/AFTER (normalized) ===');
for (const [label, find] of SAMPLE) {
  const raw = cars.find(find);
  if (!raw) continue;
  const before = estimateMarketValue(raw);
  const normalized = norm(raw);
  const after = estimateMarketValue(normalized);
  const resale = calculateResaleImpact(normalized, after);
  console.log(`\n${label}: ${raw.year} ${raw.make} ${raw.model}`);
  console.log(`  fuel: ${raw.engine.fuelType} → ${normalized.engine.fuelType} (effective: ${effectiveFuelType(normalized)})`);
  console.log(`  value: $${Math.round(before.mid/1000)}k → $${Math.round(after.mid/1000)}k (${before.low}-${before.high} → ${after.low}-${after.high})`);
  console.log(`  battery: ${after.batteryHealth?.label ?? 'none'}`);
  console.log(`  resale 5yr: $${resale.projectedResale5Year.low}-$${resale.projectedResale5Year.high}`);
  if (label === 'Camry XSE 2018') {
    const econ = computeOwnershipEconomics(normalized, []);
    console.log(`  fuel/energy CAD: $${econ.annualCost.energy} (expect ~2103)`);
  }
}

const misCount = cars.filter((c) => c.engine.fuelType === 'electric' && inferEffectiveFuelType(c) === 'plug-in hybrid').length;
console.log(`\nMisclassified electric→PHEV correctable: ${misCount}`);

const macan = cars.find((c) => c.make === 'Porsche' && c.model === 'Macan' && c.year === 2023);
console.log(`Macan trim raw: ${macan?.trim} → label: ${displayTrimLabel(macan)}`);

let degenerate = 0;
for (const c of cars) {
  const n = norm(c);
  const mv = estimateMarketValue(n);
  const r = calculateResaleImpact(n, mv);
  if (r.projectedResale5Year.high - r.projectedResale5Year.low < 100 && r.projectedResale5Year.mid < 5000) degenerate++;
}
console.log(`Degenerate resale ranges (<$100 spread, mid<$5k): ${degenerate}`);
