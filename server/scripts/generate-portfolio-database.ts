/**
 * Portfolio-grade car database generator.
 *
 * Goal:
 * - Produce a static `server/data/cars.json` file in the exact shape
 *   expected by `car.service.ts`:
 *     {
 *       cars: CarSpecsWithId[],
 *       lastUpdated: string
 *     }
 * - Use real makes/models/years from the free NHTSA VPIC API
 * - Derive plausible specs (hp/torque/MPG/dimensions/prices) so the UI
 *   has realistic data to work with
 *
 * Notes:
 * - This script is meant to be run locally or in CI, not at request time.
 * - It intentionally limits scope to a few popular makes and recent years
 *   to keep the dataset high-quality and reasonably sized.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CarSpecs } from '../src/types/car.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Focus on popular, recognisable brands
const POPULAR_MAKES = [
  'Toyota',
  'Honda',
  'Ford',
  'Chevrolet',
  'Nissan',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Volkswagen',
  'Hyundai',
  'Kia',
  'Subaru',
  'Lexus',
  'Tesla',
];

// Years that look modern enough for a portfolio
const START_YEAR = 2015;
const END_YEAR = 2024;

// Hard-coded country of origin per make (approximate but good enough)
const COUNTRY_MAP: Record<string, string> = {
  Toyota: 'Japan',
  Honda: 'Japan',
  Nissan: 'Japan',
  Subaru: 'Japan',
  Lexus: 'Japan',
  Hyundai: 'South Korea',
  Kia: 'South Korea',
  Ford: 'USA',
  Chevrolet: 'USA',
  Tesla: 'USA',
  BMW: 'Germany',
  'Mercedes-Benz': 'Germany',
  Audi: 'Germany',
  Volkswagen: 'Germany',
};

function getCountryFromMake(make: string): string {
  return COUNTRY_MAP[make] || 'USA';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchModelsForMakeYear(make: string, year: number): Promise<string[]> {
  try {
    const url = `${NHTSA_BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(
      make,
    )}/modelyear/${year}?format=json`;
    const response = await axios.get(url);
    const results = response.data?.Results ?? [];
    return results
      .map((r: any) => String(r.Model_Name).trim())
      .filter((name: string) => !!name)
      .slice(0, 8); // cap per make/year to keep dataset size reasonable
  } catch (error) {
    console.error(`Failed to fetch models for ${make} ${year}:`, error);
    return [];
  }
}

type BodyStyle =
  | 'sedan'
  | 'suv'
  | 'coupe'
  | 'convertible'
  | 'hatchback'
  | 'wagon'
  | 'truck'
  | 'van'
  | 'minivan';

function inferBodyStyle(modelName: string): BodyStyle {
  const lower = modelName.toLowerCase();
  if (/(pickup|f-150|silverado|ram|tacoma|tundra)/.test(lower)) return 'truck';
  if (/(van|sprinter|transit)/.test(lower)) return 'van';
  if (/(odyssey|sienna|caravan|pacifica)/.test(lower)) return 'minivan';
  if (/(wagon|outback|golf sportwagen)/.test(lower)) return 'wagon';
  if (/(hatch|golf|yaris|fiesta)/.test(lower)) return 'hatchback';
  if (/(coupe|mustang|camaro|miata|corvette|supra|m[23] coupe)/.test(lower)) return 'coupe';
  if (/(suv|rav4|cr-v|cx-|highlander|tahoe|explorer|forester|outback|crosstrek|model y|model x|ev6|ioniq 5)/.test(lower))
    return 'suv';
  return 'sedan';
}

function estimateSpecs(
  make: string,
  model: string,
  year: number,
  bodyStyle: BodyStyle,
): Pick<CarSpecs, 'engine' | 'performance' | 'dimensions' | 'fuelEconomy' | 'transmission' | 'driveType' | 'price'> {
  const isPerformance =
    /(m3|m4|amg|rs |sti|type r|supra|corvette|mustang gt|hellcat|gtr|911)/i.test(model);
  const isElectric = /(tesla|ev6|ioniq 5|bolt|id\.4|leaf)/i.test(model);

  let displacement = isPerformance ? 3.0 : 2.0;
  let horsepower = isPerformance ? 400 : 180;
  let torque = isPerformance ? 380 : 170;
  let fuelType: CarSpecs['engine']['fuelType'] = isElectric ? 'electric' : 'gasoline';

  // Rough adjustments by body style
  if (bodyStyle === 'truck' || bodyStyle === 'suv') {
    displacement += 0.5;
    horsepower += 40;
    torque += 60;
  }

  // Year progression
  const yearDelta = year - 2015;
  horsepower += yearDelta * 3;
  torque += yearDelta * 3;

  // MPG estimates
  let combinedMpg = isElectric ? 0 : bodyStyle === 'truck' ? 20 : bodyStyle === 'suv' ? 24 : 30;
  combinedMpg += -Math.max(0, displacement - 2) * 2;

  const city = isElectric ? undefined : Math.round(combinedMpg * 0.75);
  const highway = isElectric ? undefined : Math.round(combinedMpg * 1.15);

  // Dimensions (very rough but consistent)
  const baseLength = bodyStyle === 'truck' || bodyStyle === 'suv' ? 190 : 180;
  const baseHeight = bodyStyle === 'truck' || bodyStyle === 'suv' ? 66 : 56;
  const curbWeight =
    (bodyStyle === 'truck' || bodyStyle === 'suv' ? 3800 : 3200) + (isElectric ? 400 : 0);

  // Price estimates
  let msrp = 30000;
  if (bodyStyle === 'truck' || bodyStyle === 'suv') msrp += 8000;
  if (isPerformance) msrp += 15000;
  if (isElectric) msrp += 10000;
  if (['BMW', 'Mercedes-Benz', 'Audi', 'Lexus'].includes(make)) msrp += 12000;

  msrp += yearDelta * 800;

  return {
    engine: {
      displacement: Number(displacement.toFixed(1)),
      horsepower: Math.round(horsepower),
      torque: Math.round(torque),
      fuelType,
    },
    performance: {
      zeroToSixty: isPerformance ? 3.5 + Math.random() * 1.0 : 6.0 + Math.random() * 2.0,
      topSpeed: isPerformance ? 155 : 130,
      quarterMile: isPerformance ? 12.0 + Math.random() * 0.8 : 14.5 + Math.random() * 1.0,
    },
    dimensions: {
      length: baseLength + Math.random() * 8,
      width: 72 + Math.random() * 4,
      height: baseHeight + Math.random() * 4,
      wheelbase: 110 + Math.random() * 6,
      curbWeight,
    },
    fuelEconomy: {
      city,
      highway,
      combined: combinedMpg > 0 ? Math.round(combinedMpg) : undefined,
    },
    transmission: {
      type: isPerformance ? 'dual-clutch' : 'automatic',
      speeds: isElectric ? 1 : 8,
    },
    driveType:
      bodyStyle === 'truck' || bodyStyle === 'suv'
        ? 'AWD'
        : ['BMW', 'Mercedes-Benz', 'Audi'].includes(make)
        ? 'RWD'
        : 'FWD',
    price: {
      msrp: Math.round(msrp),
      min: Math.round(msrp * 0.8),
      max: Math.round(msrp * 1.2),
    },
  };
}

async function main() {
  console.log('🚗 Generating portfolio car database (NHTSA-based, synthetic specs)');
  console.log('================================================================\n');

  const cars: (CarSpecs & { id: string })[] = [];
  let idCounter = 1;

  for (const make of POPULAR_MAKES) {
    console.log(`\n📊 ${make}`);

    for (let year = START_YEAR; year <= END_YEAR; year++) {
      process.stdout.write(`  Year ${year}... `);

      const models = await fetchModelsForMakeYear(make, year);
      if (models.length === 0) {
        console.log('no models');
        continue;
      }

      console.log(`${models.length} models`);

      for (const model of models) {
        const bodyStyle = inferBodyStyle(model);
        const specs = estimateSpecs(make, model, year, bodyStyle);

        const car: CarSpecs & { id: string } = {
          id: `car-${String(idCounter++).padStart(5, '0')}`,
          make,
          model,
          year,
          countryOfOrigin: getCountryFromMake(make),
          bodyStyle,
          engine: specs.engine,
          performance: specs.performance,
          dimensions: specs.dimensions,
          fuelEconomy: specs.fuelEconomy,
          transmission: specs.transmission,
          driveType: specs.driveType,
          safetyRating: {
            overall: 4,
            frontal: 4,
            side: 4,
            rollover: 4,
          },
          price: specs.price,
        };

        cars.push(car);
      }

      // Be polite to the API
      await sleep(150);
    }
  }

  const db = {
    cars,
    lastUpdated: new Date().toISOString(),
  };

  const outputDir = path.join(__dirname, '..', 'data');
  const outputPath = path.join(outputDir, 'cars.json');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(db, null, 2));

  const sizeMb = fs.statSync(outputPath).size / 1024 / 1024;

  console.log('\n✅ Generation complete');
  console.log(`   Vehicles: ${cars.length}`);
  console.log(`   Output:   ${outputPath}`);
  console.log(`   Size:     ${sizeMb.toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});

