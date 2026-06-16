/**
 * One-off audit (Parts 1, 3, 4). No external calls — reads local CSV + existing NHTSA cache.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CSV = path.join(root, 'data/raw/vehicles.csv');
const CACHE = path.join(root, 'data/raw/nhtsa-enrichment-cache.json');
const CARS = path.join(root, 'data/cars.json');

// ---------- Part 3: NHTSA cache analysis (already-fetched data) ----------
function auditNhtsaCache() {
  console.log('\n=== PART 3: NHTSA cache (already fetched, no new calls) ===');
  const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const keys = Object.keys(cache);
  let withCountry = 0;
  let withSafetyObj = 0;
  let withRealOverall = 0;
  const ratedSamples = [];
  for (const k of keys) {
    const e = cache[k];
    if (e.countryOfOrigin) withCountry++;
    if (e.safetyRating) {
      withSafetyObj++;
      const o = e.safetyRating.overall;
      if (o != null && o > 0) {
        withRealOverall++;
        if (ratedSamples.length < 12) ratedSamples.push({ key: k, ...e.safetyRating });
      }
    }
  }
  console.log(`Cache entries (unique make|model|year): ${keys.length}`);
  console.log(`  with countryOfOrigin: ${withCountry}`);
  console.log(`  with safetyRating object: ${withSafetyObj}`);
  console.log(`  with real overall star (>0): ${withRealOverall} (${((withRealOverall / keys.length) * 100).toFixed(1)}%)`);
  console.log('  sample rated entries:', JSON.stringify(ratedSamples, null, 1));
  return { keys, cache, withRealOverall };
}

// ---------- Part 1: EPA field coverage ----------
const CANDIDATE_FIELDS = [
  'youSaveSpend', 'ghgScore', 'ghgScoreA', 'feScore', 'barrels08', 'barrelsA08',
  'fuelCost08', 'fuelCostA08', 'co2', 'co2A',
  'phevCity', 'phevHwy', 'phevComb', 'combA08', 'cityA08', 'highwayA08',
  'combE', 'cityE', 'highwayE', 'range', 'rangeA', 'rangeCity', 'rangeHwy',
  'charge120', 'charge240', 'charge240b', 'startStop', 'guzzler', 'fuelType2', 'atvType',
];

function isPresent(field, v) {
  if (v == null || v === '') return false;
  const s = String(v).trim();
  if (s === '' || s === '-1') return false;
  // numeric fields: 0 / 0.0 counts as "no data" for these score/cost/range fields
  const numericZeroMeansEmpty = field !== 'guzzler' && field !== 'startStop' && field !== 'fuelType2' && field !== 'atvType';
  if (numericZeroMeansEmpty) {
    const n = parseFloat(s);
    if (!Number.isNaN(n) && n === 0) return false;
  }
  return true;
}

function auditEpaFields() {
  console.log('\n=== PART 1: EPA field coverage ===');
  const rows = parse(fs.readFileSync(CSV, 'utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true });
  // Mirror build filter: year >= 1995, valid body style (approx by excluding special purpose)
  const eligible = rows.filter((r) => {
    const y = parseInt(r.year, 10);
    if (Number.isNaN(y) || y < 1995) return false;
    if ((r.VClass || '').toLowerCase().includes('special purpose')) return false;
    return true;
  });
  console.log(`Total CSV rows: ${rows.length}; eligible (yr>=1995, not special-purpose): ${eligible.length}`);

  const counts = {};
  for (const f of CANDIDATE_FIELDS) counts[f] = 0;
  for (const r of eligible) {
    for (const f of CANDIDATE_FIELDS) {
      if (isPresent(f, r[f])) counts[f]++;
    }
  }
  const tbl = CANDIDATE_FIELDS.map((f) => ({
    field: f,
    presentCount: counts[f],
    pct: `${((counts[f] / eligible.length) * 100).toFixed(1)}%`,
  }));
  console.table(tbl);

  // PHEV-specific: rows that are plug-in hybrid
  const phev = eligible.filter((r) => (r.atvType || '').toLowerCase().includes('plug-in'));
  console.log(`\nPHEV rows (atvType plug-in): ${phev.length}`);
  const phevCov = {};
  for (const f of ['phevCity', 'phevHwy', 'phevComb', 'combE', 'cityA08', 'combA08', 'rangeA', 'charge240']) phevCov[f] = 0;
  for (const r of phev) for (const f of Object.keys(phevCov)) if (isPresent(f, r[f])) phevCov[f]++;
  console.log('PHEV field coverage:', phevCov);

  // EV-specific
  const ev = eligible.filter((r) => (r.atvType || '').toLowerCase() === 'ev' || (r.fuelType1 || '').toLowerCase().includes('electricity') && !(r.atvType || '').toLowerCase().includes('plug'));
  console.log(`\nBEV-ish rows: ${ev.length}`);
  const evCov = {};
  for (const f of ['combE', 'range', 'charge120', 'charge240', 'charge240b']) evCov[f] = 0;
  for (const r of ev) for (const f of Object.keys(evCov)) if (isPresent(f, r[f])) evCov[f]++;
  console.log('BEV field coverage:', evCov);

  // Sample dumps
  console.log('\n=== Sample raw rows ===');
  const samples = [
    ['Cayenne e-Hybrid 2019 PHEV', (r) => r.make === 'Porsche' && r.model === 'Cayenne e-Hybrid' && r.year === '2019'],
    ['Prius Prime 2020 PHEV', (r) => r.make === 'Toyota' && r.model.includes('Prius Prime') && r.year === '2020'],
    ['Camry XSE 2018 gas', (r) => r.make === 'Toyota' && r.model === 'Camry XSE' && r.year === '2018'],
    ['Model 3 LR 2022 BEV', (r) => r.make === 'Tesla' && r.model.includes('Model 3 Long Range') && r.year === '2022'],
  ];
  const showFields = ['make', 'model', 'year', 'fuelType', 'fuelType1', 'fuelType2', 'atvType', 'phevBlended',
    'comb08', 'combA08', 'combE', 'phevComb', 'phevCity', 'phevHwy', 'cityA08', 'highwayA08',
    'range', 'rangeA', 'charge120', 'charge240', 'youSaveSpend', 'ghgScore', 'ghgScoreA', 'co2', 'fuelCost08', 'fuelCostA08', 'barrels08'];
  for (const [label, find] of samples) {
    const r = eligible.find(find);
    if (!r) { console.log(`\n${label}: NOT FOUND`); continue; }
    const picked = {};
    for (const f of showFields) picked[f] = r[f];
    console.log(`\n${label}:`, JSON.stringify(picked));
  }
}

auditNhtsaCache();
auditEpaFields();
