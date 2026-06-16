/**
 * One-off audit script — Parts 1-4. Run: node server/scripts/audit-valuation-integrity.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Dynamic import compiled utils (run after build) or use tsx
const {
  estimateMarketValue,
  estimateNewVehicleMsrp,
  classifyMarketSegment,
  effectiveFuelType,
  classifyEvRetentionTier,
} = await import('../dist/utils/vehicle-valuation.js');
const { computeOwnershipEconomics, calculateResaleImpact } = await import('../dist/utils/ownership-economics.js');
const { usdAnchorToCadValue } = await import('../dist/config/regional-assumptions.js');

const data = JSON.parse(fs.readFileSync(path.join(root, 'data/cars.json'), 'utf8'));
const cars = data.cars;

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Math.round(n / 1000)}k`;
}

function resaleDisplay(low, high) {
  const fl = Math.round(low / 1000);
  const fh = Math.round(high / 1000);
  return `${fl}k-${fh}k`;
}

function isDegenerateResale(low, high) {
  return Math.round(low / 1000) === Math.round(high / 1000) && low < 5000;
}

// --- Part 3: field completeness ---
function auditCompleteness() {
  const n = cars.length;
  const miss = (fn) => cars.filter(fn).length;
  const pct = (c) => `${((c / n) * 100).toFixed(1)}%`;

  const fuelTypes = {};
  for (const c of cars) {
    const ft = c.engine?.fuelType ?? 'missing';
    fuelTypes[ft] = (fuelTypes[ft] || 0) + 1;
  }

  const dispTypes = { number: 0, string: 0, missing: 0 };
  for (const c of cars) {
    const d = c.engine?.displacement;
    if (d == null) dispTypes.missing++;
    else if (typeof d === 'number') dispTypes.number++;
    else dispTypes.string++;
  }

  const msrpVals = cars.map((c) => c.price?.msrp).filter((v) => v != null && v > 0);
  const uniqueMsrp = new Set(msrpVals.map((v) => Math.round(v / 100) * 100)).size;

  console.log('\n=== PART 3: Field completeness ===');
  console.log(`Total records: ${n}`);
  console.log(`Missing horsepower: ${pct(miss((c) => !c.engine?.horsepower))} (${miss((c) => !c.engine?.horsepower)}/${n})`);
  console.log(`Missing NHTSA overall: ${pct(miss((c) => !c.safetyRating?.overall))}`);
  console.log(`Missing/zero price.msrp: ${pct(miss((c) => !c.price?.msrp || c.price.msrp <= 0))}`);
  console.log(`Displacement types:`, dispTypes);
  console.log(`Missing country: ${pct(miss((c) => !c.countryOfOrigin))}`);
  console.log(`Missing driveType: ${pct(miss((c) => !c.driveType))}`);
  console.log(`Fuel type distribution:`, fuelTypes);
  console.log(`price.msrp unique rounded values (÷100): ${uniqueMsrp} across ${msrpVals.length} non-zero records`);

  // PHEV misclassification
  const electric = cars.filter((c) => c.engine?.fuelType === 'electric');
  const shortRange = electric.filter((c) => {
    const r = c.epa?.rangeMiles ?? 0;
    return r > 0 && r < 50;
  });
  const withDisp = shortRange.filter((c) => c.engine?.displacement && c.engine.displacement >= 1.5);

  console.log(`\nElectric-tagged records: ${electric.length}`);
  console.log(`Electric + range < 50 mi: ${shortRange.length}`);
  console.log(`...with gas displacement ≥1.5L (likely PHEV): ${withDisp.length}`);

  return { shortRange, withDisp, fuelTypes };
}

// --- Part 1 sample matrix ---
const SAMPLE_IDS = [
  { label: 'Economy sedan', find: (c) => c.make === 'Toyota' && c.model === 'Corolla' && c.year === 2020 },
  { label: 'Economy SUV', find: (c) => c.make === 'Toyota' && c.model === 'RAV4' && c.year === 2020 && c.engine.fuelType === 'gasoline' },
  { label: 'Luxury sedan', find: (c) => c.make === 'BMW' && c.model.includes('530') && c.year === 2019 },
  { label: 'Macan', find: (c) => c.make === 'Porsche' && c.model === 'Macan' && c.year === 2023 },
  { label: 'Luxury SUV (X5)', find: (c) => c.make === 'BMW' && c.model.startsWith('X5') && c.year === 2020 },
  { label: 'Sports coupe', find: (c) => c.make === 'Chevrolet' && c.model === 'Corvette' && c.year === 2019 },
  { label: 'Pickup', find: (c) => c.make === 'Ford' && c.model === 'F-150' && c.year === 2020 },
  { label: 'BEV (Model 3)', find: (c) => c.make === 'Tesla' && c.model.includes('Model 3 Long Range') && c.year === 2022 },
  { label: 'Cayenne e-Hybrid', find: (c) => c.id === 'porsche-cayenne-e-hybrid-2019-cayenne-automatic-s8' },
  { label: 'Prius Prime', find: (c) => c.make === 'Toyota' && c.model.includes('Prius Prime') && c.year === 2020 },
  { label: 'Hybrid (Camry)', find: (c) => c.make === 'Toyota' && c.model.includes('Camry Hybrid') && c.year === 2020 },
  { label: '1990s vehicle', find: (c) => c.make === 'Honda' && c.model === 'Civic' && c.year === 1998 },
  { label: 'Camry XSE 2018', find: (c) => c.id === 'toyota-camry-xse-2018-camry-automatic-s8' },
];

function runSampleMatrix() {
  console.log('\n=== PART 1: Sample valuation matrix ===');
  const rows = [];
  for (const s of SAMPLE_IDS) {
    const car = cars.find(s.find);
    if (!car) {
      console.log(`MISSING: ${s.label}`);
      continue;
    }
    const mv = estimateMarketValue(car);
    const msrpRule = estimateNewVehicleMsrp(car);
    const segment = classifyMarketSegment(car);
    const ft = effectiveFuelType(car);
    const tier = classifyEvRetentionTier(car);
    const dataMsrp = car.price?.msrp;

    rows.push({
      label: s.label,
      vehicle: `${car.year} ${car.make} ${car.model}`,
      body: car.bodyStyle,
      dataMsrp: dataMsrp,
      ruleMsrpUsd: msrpRule,
      anchorCad: mv.msrpAnchor,
      segment,
      fuelType: car.engine.fuelType,
      effectiveFt: ft,
      evTier: tier,
      value: `${fmt(mv.low)}-${fmt(mv.high)}`,
      mid: mv.mid,
      retained: mv.retainedFraction,
      battery: mv.batteryHealth?.label,
    });
  }
  console.table(rows);

  const rav4 = rows.find((r) => r.label === 'Economy SUV');
  const macan = rows.find((r) => r.label === 'Macan');
  if (rav4 && macan) {
    const ratio = macan.mid / rav4.mid;
    console.log(`Macan mid / RAV4 mid ratio: ${ratio.toFixed(2)}x`);
  }
  return rows;
}

// --- Part 2: trim label simulation ---
function simulateTrimLabel(trim, model) {
  const TRIM_NOISE = new Set([
    'automatic', 'manual', 'auto', 'cvt', 'spd', 'mode', 'clkup', 'av', 's6', 's8', 's10',
  ]);
  function titleToken(token) {
    if (/^\d/.test(token)) return token.toUpperCase();
    if (token.length <= 4) return token.toUpperCase();
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  }
  if (!trim || trim === 'base') return null;
  const isSlug = /^[a-z0-9]+(-[a-z0-9]+)+$/.test(trim);
  if (!isSlug) return trim;
  const modelSlug = model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let rest = trim;
  if (rest.startsWith(`${modelSlug}-`)) rest = rest.slice(modelSlug.length + 1);
  else if (rest === modelSlug) return null;
  const modelTokens = new Set(model.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const tokens = rest.split('-').filter(Boolean);
  const meaningful = tokens.filter((t) => !TRIM_NOISE.has(t) && !/^s\d+$/.test(t) && !modelTokens.has(t));
  if (meaningful.length === 0) return null;
  return meaningful.map(titleToken).join(' ');
}

function auditTrimLabels() {
  console.log('\n=== PART 2: Trim label leaks ===');
  const samples = [
    ...cars.filter((c) => c.make === 'Porsche' && c.model === 'Macan').slice(0, 5),
    ...cars.filter((c) => c.make === 'Toyota' && c.model.includes('Camry')).slice(0, 5),
    ...cars.filter((c) => c.year < 2000).slice(0, 5),
    ...cars.filter((c) => c.engine?.fuelType === 'electric').slice(0, 5),
  ];
  const leaks = [];
  for (const c of cars) {
    const label = simulateTrimLabel(c.trim, c.model);
    if (label && (/^[A-Z]{1,3}$/.test(label) || label.includes('-') || /automatic|manual/i.test(label))) {
      leaks.push({ id: c.id, trim: c.trim, label, model: c.model });
    }
  }
  console.log(`Potential trim leaks (pattern): ${leaks.length}`);
  console.log('Sample leaks:', leaks.slice(0, 25));
  return leaks;
}

// --- Part 4: degenerate resale ---
function auditResaleFloor() {
  console.log('\n=== PART 4: Degenerate resale ranges ===');
  let degenerate = 0;
  const examples = [];
  for (const c of cars) {
    const mv = estimateMarketValue(c);
    const resale = calculateResaleImpact(c, mv);
    const { low, high } = resale.projectedResale5Year;
    if (isDegenerateResale(low, high)) {
      degenerate++;
      if (examples.length < 15) {
        examples.push({
          vehicle: `${c.year} ${c.make} ${c.model}`,
          mid: mv.mid,
          resale: resaleDisplay(low, high),
          low,
          high,
        });
      }
    }
  }
  console.log(`Records with degenerate $Xk-$Xk resale (mid < ~5k rounded): ${degenerate} / ${cars.length}`);
  console.table(examples);
  return degenerate;
}

auditCompleteness();
runSampleMatrix();
auditTrimLabels();
auditResaleFloor();
