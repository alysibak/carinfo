import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const cache = JSON.parse(fs.readFileSync(path.join(root, 'data/raw/nhtsa-enrichment-cache.json'), 'utf8'));
const cars = JSON.parse(fs.readFileSync(path.join(root, 'data/cars.json'), 'utf8')).cars;

let recordsWithRating = 0;
const yearHist = {};
let withEpaId = 0;
for (const c of cars) {
  if (c.epaId != null) withEpaId++;
  const key = `${c.make}|${c.model}|${c.year}`;
  const e = cache[key];
  if (e && e.safetyRating && e.safetyRating.overall > 0) {
    recordsWithRating++;
    yearHist[c.year] = (yearHist[c.year] || 0) + 1;
  }
}
console.log(`Total cars.json records: ${cars.length}`);
console.log(`Records with epaId: ${withEpaId} (${((withEpaId/cars.length)*100).toFixed(1)}%)`);
console.log(`Records that match a cached REAL rating: ${recordsWithRating} (${((recordsWithRating/cars.length)*100).toFixed(1)}%)`);
const years = Object.keys(yearHist).map(Number).sort((a,b)=>a-b);
console.log(`Rated-record year range: ${years[0]}–${years[years.length-1]}`);
console.log('Rated records by year:', JSON.stringify(yearHist));

// Cache year coverage (what years were ever attempted)
const attemptYears = {};
for (const k of Object.keys(cache)) {
  const y = k.split('|')[2];
  attemptYears[y] = (attemptYears[y]||0)+1;
}
console.log('Cache attempts by year:', JSON.stringify(attemptYears));
