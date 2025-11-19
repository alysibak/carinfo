/**
 * Generate comprehensive car database
 * This script creates a massive database with cars from 1990-2024
 * covering all major manufacturers worldwide
 */

const fs = require('fs');
const path = require('path');

// Comprehensive car data generator
const generateCarDatabase = () => {
  const cars = [];
  let idCounter = 1;

  // Helper to create car ID
  const createId = () => `car-${String(idCounter++).padStart(4, '0')}`;

  // Toyota vehicles (Japan)
  const toyotaModels = [
    { model: 'Camry', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.5, hp: 203, torque: 184 }, msrp: 26320 },
    { model: 'Corolla', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 1.8, hp: 139, torque: 126 }, msrp: 21550 },
    { model: 'RAV4', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 203, torque: 184 }, msrp: 28275 },
    { model: 'Highlander', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.5, hp: 295, torque: 263 }, msrp: 36420 },
    { model: '4Runner', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 4.0, hp: 270, torque: 278 }, msrp: 40040 },
    { model: 'Tacoma', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'truck', engine: { base: 3.5, hp: 278, torque: 265 }, msrp: 28150 },
    { model: 'Tundra', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'truck', engine: { base: 5.7, hp: 381, torque: 401 }, msrp: 37645 },
    { model: 'Supra', years: [1998, 2020, 2021, 2022, 2023], bodyStyle: 'coupe', engine: { base: 3.0, hp: 382, torque: 368 }, msrp: 44315 },
    { model: 'Prius', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'hatchback', engine: { base: 1.8, hp: 121, torque: 105 }, msrp: 27450, fuelType: 'hybrid' },
    { model: 'Land Cruiser', years: [2000, 2005, 2010, 2015, 2020], bodyStyle: 'suv', engine: { base: 5.7, hp: 381, torque: 401 }, msrp: 85665 },
  ];

  toyotaModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Toyota',
        model: model.model,
        year,
        countryOfOrigin: 'Japan',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2015 ? 10 : 0),
          torque: model.engine.torque + (year > 2015 ? 5 : 0),
          fuelType: model.fuelType || 'gasoline',
          configuration: model.engine.base > 3 ? `V${Math.ceil(model.engine.base * 2)}` : 'Inline-4'
        },
        performance: {
          zeroToSixty: 6.5 - (model.engine.hp / 100),
          topSpeed: 120 + (model.engine.hp / 5),
          quarterMile: 14.5 - (model.engine.hp / 150)
        },
        dimensions: {
          length: 180 + (model.bodyStyle === 'suv' ? 10 : 0),
          width: 72,
          height: model.bodyStyle === 'suv' ? 68 : 58,
          wheelbase: 110,
          curbWeight: 3200 + (model.bodyStyle === 'suv' ? 500 : 0)
        },
        fuelEconomy: {
          city: model.fuelType === 'hybrid' ? 54 : 25 - Math.floor(model.engine.base),
          highway: model.fuelType === 'hybrid' ? 50 : 35 - Math.floor(model.engine.base),
          combined: model.fuelType === 'hybrid' ? 52 : 30 - Math.floor(model.engine.base)
        },
        transmission: { type: 'automatic', speeds: year > 2010 ? 8 : 6 },
        driveType: model.bodyStyle === 'truck' || model.bodyStyle === 'suv' ? 'AWD' : 'FWD',
        price: { msrp: model.msrp + (year - 2020) * 1000 }
      });
    });
  });

  // Honda vehicles (Japan)
  const hondaModels = [
    { model: 'Civic', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 158, torque: 138 }, msrp: 23750 },
    { model: 'Accord', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 192, torque: 192 }, msrp: 27295 },
    { model: 'CR-V', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 1.5, hp: 190, torque: 179 }, msrp: 28410 },
    { model: 'Pilot', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.5, hp: 280, torque: 262 }, msrp: 39150 },
    { model: 'Odyssey', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'minivan', engine: { base: 3.5, hp: 280, torque: 262 }, msrp: 38635 },
    { model: 'Ridgeline', years: [2010, 2015, 2020, 2023], bodyStyle: 'truck', engine: { base: 3.5, hp: 280, torque: 262 }, msrp: 38800 },
    { model: 'HR-V', years: [2016, 2018, 2020, 2022, 2023], bodyStyle: 'suv', engine: { base: 1.8, hp: 141, torque: 127 }, msrp: 24895 },
  ];

  hondaModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Honda',
        model: model.model,
        year,
        countryOfOrigin: 'Japan',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2015 ? 8 : 0),
          torque: model.engine.torque + (year > 2015 ? 5 : 0),
          fuelType: 'gasoline',
          configuration: model.engine.base > 2.5 ? 'V6' : model.engine.base > 1.8 ? 'Inline-4' : 'Inline-4 Turbo'
        },
        performance: {
          zeroToSixty: 7.0 - (model.engine.hp / 100),
          topSpeed: 115 + (model.engine.hp / 5),
          quarterMile: 15.0 - (model.engine.hp / 150)
        },
        dimensions: {
          length: 175 + (model.bodyStyle === 'suv' ? 10 : 0),
          width: 71,
          height: model.bodyStyle === 'suv' ? 66 : 57,
          wheelbase: 108,
          curbWeight: 3100 + (model.bodyStyle === 'suv' ? 400 : 0)
        },
        fuelEconomy: {
          city: 26 - Math.floor(model.engine.base),
          highway: 36 - Math.floor(model.engine.base),
          combined: 31 - Math.floor(model.engine.base)
        },
        transmission: { type: year > 2018 ? 'cvt' : 'automatic', speeds: year > 2018 ? 1 : 6 },
        driveType: model.bodyStyle === 'suv' ? 'AWD' : 'FWD',
        price: { msrp: model.msrp + (year - 2020) * 800 }
      });
    });
  });

  // Ford vehicles (USA)
  const fordModels = [
    { model: 'F-150', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'truck', engine: { base: 5.0, hp: 400, torque: 410 }, msrp: 34585 },
    { model: 'Mustang', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'coupe', engine: { base: 5.0, hp: 450, torque: 410 }, msrp: 28865 },
    { model: 'Explorer', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.0, hp: 300, torque: 310 }, msrp: 36760 },
    { model: 'Escape', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.0, hp: 250, torque: 280 }, msrp: 28190 },
    { model: 'Expedition', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.5, hp: 380, torque: 470 }, msrp: 54050 },
    { model: 'Bronco', years: [2021, 2022, 2023, 2024], bodyStyle: 'suv', engine: { base: 2.7, hp: 330, torque: 415 }, msrp: 38830 },
    { model: 'Ranger', years: [2000, 2005, 2019, 2020, 2022, 2023], bodyStyle: 'truck', engine: { base: 2.3, hp: 270, torque: 310 }, msrp: 27400 },
  ];

  fordModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Ford',
        model: model.model,
        year,
        countryOfOrigin: 'USA',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 15 : 0),
          torque: model.engine.torque + (year > 2018 ? 10 : 0),
          fuelType: 'gasoline',
          configuration: model.engine.base > 4 ? 'V8' : model.engine.base > 2.5 ? 'V6' : 'Inline-4 Turbo'
        },
        performance: {
          zeroToSixty: 6.0 - (model.engine.hp / 120),
          topSpeed: 120 + (model.engine.hp / 4),
          quarterMile: 14.0 - (model.engine.hp / 130)
        },
        dimensions: {
          length: model.bodyStyle === 'truck' ? 230 : 190,
          width: 75,
          height: model.bodyStyle === 'truck' ? 76 : 68,
          wheelbase: 120,
          curbWeight: model.bodyStyle === 'truck' ? 4400 : 3600
        },
        fuelEconomy: {
          city: 20 - Math.floor(model.engine.base / 2),
          highway: 28 - Math.floor(model.engine.base / 2),
          combined: 24 - Math.floor(model.engine.base / 2)
        },
        transmission: { type: 'automatic', speeds: year > 2015 ? 10 : 6 },
        driveType: model.bodyStyle === 'truck' ? '4WD' : model.bodyStyle === 'suv' ? 'AWD' : 'RWD',
        price: { msrp: model.msrp + (year - 2020) * 1200 }
      });
    });
  });

  // Chevrolet vehicles (USA)
  const chevroletModels = [
    { model: 'Silverado', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'truck', engine: { base: 5.3, hp: 355, torque: 383 }, msrp: 36200 },
    { model: 'Corvette', years: [1995, 2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'coupe', engine: { base: 6.2, hp: 490, torque: 465 }, msrp: 65900 },
    { model: 'Camaro', years: [1995, 2000, 2010, 2015, 2020, 2023], bodyStyle: 'coupe', engine: { base: 6.2, hp: 455, torque: 455 }, msrp: 26100 },
    { model: 'Tahoe', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 5.3, hp: 355, torque: 383 }, msrp: 52300 },
    { model: 'Suburban', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 5.3, hp: 355, torque: 383 }, msrp: 55300 },
    { model: 'Equinox', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 1.5, hp: 170, torque: 203 }, msrp: 27800 },
    { model: 'Traverse', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.6, hp: 310, torque: 266 }, msrp: 35700 },
  ];

  chevroletModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Chevrolet',
        model: model.model,
        year,
        countryOfOrigin: 'USA',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 12 : 0),
          torque: model.engine.torque + (year > 2018 ? 10 : 0),
          fuelType: 'gasoline',
          configuration: model.engine.base > 5 ? 'V8' : model.engine.base > 2.5 ? 'V6' : 'Inline-4 Turbo'
        },
        performance: {
          zeroToSixty: 5.5 - (model.engine.hp / 130),
          topSpeed: 125 + (model.engine.hp / 4),
          quarterMile: 13.5 - (model.engine.hp / 140)
        },
        dimensions: {
          length: model.bodyStyle === 'truck' ? 232 : 192,
          width: 76,
          height: model.bodyStyle === 'truck' ? 75 : 66,
          wheelbase: 118,
          curbWeight: model.bodyStyle === 'truck' ? 4500 : 3700
        },
        fuelEconomy: {
          city: 19 - Math.floor(model.engine.base / 2),
          highway: 27 - Math.floor(model.engine.base / 2),
          combined: 23 - Math.floor(model.engine.base / 2)
        },
        transmission: { type: 'automatic', speeds: year > 2015 ? 10 : 6 },
        driveType: model.bodyStyle === 'truck' ? '4WD' : model.bodyStyle === 'suv' ? 'AWD' : 'RWD',
        price: { msrp: model.msrp + (year - 2020) * 1300 }
      });
    });
  });

  // BMW vehicles (Germany)
  const bmwModels = [
    { model: '3 Series', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 3.0, hp: 255, torque: 295 }, msrp: 42300 },
    { model: '5 Series', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 3.0, hp: 335, torque: 330 }, msrp: 55700 },
    { model: 'X3', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.0, hp: 248, torque: 258 }, msrp: 45400 },
    { model: 'X5', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.0, hp: 335, torque: 330 }, msrp: 60600 },
    { model: 'M3', years: [2005, 2010, 2015, 2021, 2023], bodyStyle: 'sedan', engine: { base: 3.0, hp: 503, torque: 479 }, msrp: 73300 },
    { model: 'M5', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 4.4, hp: 600, torque: 553 }, msrp: 106700 },
    { model: 'X7', years: [2019, 2020, 2022, 2023], bodyStyle: 'suv', engine: { base: 3.0, hp: 375, torque: 398 }, msrp: 77850 },
  ];

  bmwModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'BMW',
        model: model.model,
        year,
        countryOfOrigin: 'Germany',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 20 : 0),
          torque: model.engine.torque + (year > 2018 ? 15 : 0),
          fuelType: 'gasoline',
          configuration: model.engine.base > 3.5 ? 'V8 Twin-Turbo' : 'Inline-6 Twin-Turbo'
        },
        performance: {
          zeroToSixty: 5.0 - (model.engine.hp / 150),
          topSpeed: 130 + (model.engine.hp / 3.5),
          quarterMile: 13.0 - (model.engine.hp / 160)
        },
        dimensions: {
          length: 185 + (model.bodyStyle === 'suv' ? 10 : 0),
          width: 74,
          height: model.bodyStyle === 'suv' ? 69 : 57,
          wheelbase: 113,
          curbWeight: 3800 + (model.bodyStyle === 'suv' ? 400 : 0)
        },
        fuelEconomy: {
          city: 23 - Math.floor(model.engine.base),
          highway: 32 - Math.floor(model.engine.base),
          combined: 27 - Math.floor(model.engine.base)
        },
        transmission: { type: 'automatic', speeds: 8 },
        driveType: model.bodyStyle === 'suv' ? 'AWD' : year > 2015 ? 'AWD' : 'RWD',
        price: { msrp: model.msrp + (year - 2020) * 1500 }
      });
    });
  });

  // Mercedes-Benz vehicles (Germany)
  const mercedesModels = [
    { model: 'C-Class', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 255, torque: 273 }, msrp: 43550 },
    { model: 'E-Class', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 3.0, hp: 362, torque: 369 }, msrp: 56750 },
    { model: 'S-Class', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 3.0, hp: 429, torque: 384 }, msrp: 114500 },
    { model: 'GLC', years: [2016, 2018, 2020, 2022, 2023], bodyStyle: 'suv', engine: { base: 2.0, hp: 255, torque: 273 }, msrp: 45600 },
    { model: 'GLE', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.0, hp: 362, torque: 369 }, msrp: 58050 },
    { model: 'AMG GT', years: [2016, 2018, 2020, 2022, 2023], bodyStyle: 'coupe', engine: { base: 4.0, hp: 523, torque: 494 }, msrp: 102100 },
  ];

  mercedesModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Mercedes-Benz',
        model: model.model,
        year,
        countryOfOrigin: 'Germany',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 18 : 0),
          torque: model.engine.torque + (year > 2018 ? 12 : 0),
          fuelType: model.model === 'S-Class' ? 'hybrid' : 'gasoline',
          configuration: model.engine.base > 3.5 ? 'V8 Twin-Turbo' : 'Inline-6 Turbo'
        },
        performance: {
          zeroToSixty: 4.8 - (model.engine.hp / 160),
          topSpeed: 135 + (model.engine.hp / 3.5),
          quarterMile: 13.0 - (model.engine.hp / 165)
        },
        dimensions: {
          length: 188 + (model.bodyStyle === 'suv' ? 8 : 0),
          width: 75,
          height: model.bodyStyle === 'suv' ? 68 : 58,
          wheelbase: 115,
          curbWeight: 3900 + (model.bodyStyle === 'suv' ? 500 : 0)
        },
        fuelEconomy: {
          city: model.engine.fuelType === 'hybrid' ? 23 : 21 - Math.floor(model.engine.base),
          highway: model.engine.fuelType === 'hybrid' ? 32 : 30 - Math.floor(model.engine.base),
          combined: model.engine.fuelType === 'hybrid' ? 27 : 25 - Math.floor(model.engine.base)
        },
        transmission: { type: 'automatic', speeds: 9 },
        driveType: model.bodyStyle === 'suv' ? 'AWD' : 'RWD',
        price: { msrp: model.msrp + (year - 2020) * 1600 }
      });
    });
  });

  // Audi vehicles (Germany)
  const audiModels = [
    { model: 'A4', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 201, torque: 236 }, msrp: 39900 },
    { model: 'A6', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 3.0, hp: 335, torque: 369 }, msrp: 56200 },
    { model: 'Q5', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.0, hp: 261, torque: 273 }, msrp: 44800 },
    { model: 'Q7', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.0, hp: 335, torque: 369 }, msrp: 57800 },
    { model: 'RS 6', years: [2015, 2020, 2022, 2023], bodyStyle: 'wagon', engine: { base: 4.0, hp: 621, torque: 627 }, msrp: 121095 },
    { model: 'e-tron', years: [2019, 2020, 2021, 2022, 2023], bodyStyle: 'suv', engine: { base: 0, hp: 402, torque: 490 }, msrp: 67400, fuelType: 'electric' },
  ];

  audiModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Audi',
        model: model.model,
        year,
        countryOfOrigin: 'Germany',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 15 : 0),
          torque: model.engine.torque + (year > 2018 ? 12 : 0),
          fuelType: model.fuelType || 'gasoline',
          configuration: model.fuelType === 'electric' ? 'Dual Electric Motors' : model.engine.base > 3.5 ? 'V8 Twin-Turbo' : model.engine.base > 2.5 ? 'V6 Turbo' : 'Inline-4 Turbo'
        },
        performance: {
          zeroToSixty: 5.2 - (model.engine.hp / 155),
          topSpeed: 130 + (model.engine.hp / 3.8),
          quarterMile: 13.3 - (model.engine.hp / 165)
        },
        dimensions: {
          length: 186 + (model.bodyStyle === 'suv' ? 10 : 0),
          width: 74,
          height: model.bodyStyle === 'suv' ? 67 : 57,
          wheelbase: 112,
          curbWeight: model.fuelType === 'electric' ? 5500 : 3850 + (model.bodyStyle === 'suv' ? 450 : 0)
        },
        fuelEconomy: {
          city: model.fuelType === 'electric' ? 78 : 22 - Math.floor(model.engine.base),
          highway: model.fuelType === 'electric' ? 78 : 31 - Math.floor(model.engine.base),
          combined: model.fuelType === 'electric' ? 78 : 26 - Math.floor(model.engine.base)
        },
        transmission: { type: 'automatic', speeds: 8 },
        driveType: 'AWD',
        price: { msrp: model.msrp + (year - 2020) * 1400 }
      });
    });
  });

  // Tesla vehicles (USA - Electric)
  const teslaModels = [
    { model: 'Model S', years: [2012, 2015, 2018, 2020, 2022, 2023], bodyStyle: 'sedan', engine: { hp: 670, torque: 659 }, msrp: 94990, range: 405 },
    { model: 'Model 3', years: [2017, 2018, 2020, 2022, 2023], bodyStyle: 'sedan', engine: { hp: 480, torque: 471 }, msrp: 43990, range: 358 },
    { model: 'Model X', years: [2015, 2018, 2020, 2022, 2023], bodyStyle: 'suv', engine: { hp: 670, torque: 659 }, msrp: 109990, range: 348 },
    { model: 'Model Y', years: [2020, 2021, 2022, 2023], bodyStyle: 'suv', engine: { hp: 480, torque: 471 }, msrp: 54990, range: 330 },
  ];

  teslaModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Tesla',
        model: model.model,
        year,
        countryOfOrigin: 'USA',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: 0,
          horsepower: model.engine.hp + (year > 2020 ? 20 : 0),
          torque: model.engine.torque + (year > 2020 ? 15 : 0),
          fuelType: 'electric',
          configuration: 'Dual Electric Motors'
        },
        performance: {
          zeroToSixty: 3.8 - (model.engine.hp / 200),
          topSpeed: 145 + (model.engine.hp / 5),
          quarterMile: 12.0 - (model.engine.hp / 180)
        },
        dimensions: {
          length: 185 + (model.bodyStyle === 'suv' ? 10 : 0),
          width: 73,
          height: model.bodyStyle === 'suv' ? 64 : 57,
          wheelbase: 113,
          curbWeight: 4000 + (model.bodyStyle === 'suv' ? 400 : 0)
        },
        fuelEconomy: {
          city: 120 + (year - 2020) * 5,
          highway: 115 + (year - 2020) * 5,
          combined: 117 + (year - 2020) * 5
        },
        transmission: { type: 'automatic', speeds: 1 },
        driveType: 'AWD',
        price: { msrp: model.msrp + (year - 2020) * 2000 }
      });
    });
  });

  // Nissan vehicles (Japan)
  const nissanModels = [
    { model: 'Altima', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.5, hp: 188, torque: 180 }, msrp: 25650 },
    { model: 'Maxima', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 3.5, hp: 300, torque: 261 }, msrp: 41050 },
    { model: 'Rogue', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 181, torque: 181 }, msrp: 27750 },
    { model: 'Pathfinder', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.5, hp: 284, torque: 259 }, msrp: 35400 },
    { model: 'GT-R', years: [2009, 2012, 2015, 2018, 2020, 2023], bodyStyle: 'coupe', engine: { base: 3.8, hp: 565, torque: 467 }, msrp: 116040 },
    { model: 'Z', years: [2003, 2009, 2015, 2023], bodyStyle: 'coupe', engine: { base: 3.0, hp: 400, torque: 350 }, msrp: 41015 },
    { model: 'Armada', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 5.6, hp: 400, torque: 413 }, msrp: 50900 },
  ];

  nissanModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Nissan',
        model: model.model,
        year,
        countryOfOrigin: 'Japan',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 10 : 0),
          torque: model.engine.torque + (year > 2018 ? 8 : 0),
          fuelType: 'gasoline',
          configuration: model.engine.base > 4 ? 'V8' : model.engine.base > 3 ? 'V6 Twin-Turbo' : 'Inline-4'
        },
        performance: {
          zeroToSixty: 6.5 - (model.engine.hp / 120),
          topSpeed: 120 + (model.engine.hp / 4.5),
          quarterMile: 14.5 - (model.engine.hp / 150)
        },
        dimensions: {
          length: 182 + (model.bodyStyle === 'suv' ? 12 : 0),
          width: 73,
          height: model.bodyStyle === 'suv' ? 68 : 55,
          wheelbase: 110,
          curbWeight: 3300 + (model.bodyStyle === 'suv' ? 600 : 0)
        },
        fuelEconomy: {
          city: 23 - Math.floor(model.engine.base),
          highway: 32 - Math.floor(model.engine.base),
          combined: 27 - Math.floor(model.engine.base)
        },
        transmission: { type: year > 2015 ? 'cvt' : 'automatic', speeds: year > 2015 ? 1 : 6 },
        driveType: model.bodyStyle === 'suv' || model.model === 'GT-R' ? 'AWD' : 'FWD',
        price: { msrp: model.msrp + (year - 2020) * 900 }
      });
    });
  });

  // Mazda vehicles (Japan)
  const mazdaModels = [
    { model: 'Mazda3', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.5, hp: 186, torque: 186 }, msrp: 23200 },
    { model: 'Mazda6', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.5, hp: 187, torque: 186 }, msrp: 25500 },
    { model: 'CX-5', years: [2013, 2015, 2018, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 187, torque: 186 }, msrp: 27200 },
    { model: 'CX-9', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 250, torque: 320 }, msrp: 37130 },
    { model: 'MX-5 Miata', years: [2000, 2005, 2010, 2016, 2020, 2023], bodyStyle: 'convertible', engine: { base: 2.0, hp: 181, torque: 151 }, msrp: 28665 },
  ];

  mazdaModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Mazda',
        model: model.model,
        year,
        countryOfOrigin: 'Japan',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 8 : 0),
          torque: model.engine.torque + (year > 2018 ? 6 : 0),
          fuelType: 'gasoline',
          configuration: 'Inline-4' + (model.engine.hp > 200 ? ' Turbo' : '')
        },
        performance: {
          zeroToSixty: 7.0 - (model.engine.hp / 110),
          topSpeed: 115 + (model.engine.hp / 5),
          quarterMile: 15.0 - (model.engine.hp / 140)
        },
        dimensions: {
          length: model.model === 'MX-5 Miata' ? 154 : 182 + (model.bodyStyle === 'suv' ? 10 : 0),
          width: model.model === 'MX-5 Miata' ? 68 : 72,
          height: model.bodyStyle === 'suv' ? 66 : model.model === 'MX-5 Miata' ? 49 : 57,
          wheelbase: model.model === 'MX-5 Miata' ? 91 : 108,
          curbWeight: model.model === 'MX-5 Miata' ? 2453 : 3200 + (model.bodyStyle === 'suv' ? 400 : 0)
        },
        fuelEconomy: {
          city: 26 - Math.floor(model.engine.base / 2),
          highway: 35 - Math.floor(model.engine.base / 2),
          combined: 30 - Math.floor(model.engine.base / 2)
        },
        transmission: { type: model.model === 'MX-5 Miata' ? 'manual' : 'automatic', speeds: model.model === 'MX-5 Miata' ? 6 : 6 },
        driveType: model.bodyStyle === 'suv' ? 'AWD' : 'RWD',
        price: { msrp: model.msrp + (year - 2020) * 700 }
      });
    });
  });

  // Subaru vehicles (Japan)
  const subaruModels = [
    { model: 'Impreza', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 152, torque: 145 }, msrp: 20295 },
    { model: 'WRX', years: [2004, 2008, 2011, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.4, hp: 271, torque: 258 }, msrp: 30605 },
    { model: 'Outback', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'wagon', engine: { base: 2.5, hp: 182, torque: 176 }, msrp: 28395 },
    { model: 'Forester', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 182, torque: 176 }, msrp: 26995 },
    { model: 'Ascent', years: [2019, 2020, 2022, 2023], bodyStyle: 'suv', engine: { base: 2.4, hp: 260, torque: 277 }, msrp: 33970 },
  ];

  subaruModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Subaru',
        model: model.model,
        year,
        countryOfOrigin: 'Japan',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 6 : 0),
          torque: model.engine.torque + (year > 2018 ? 5 : 0),
          fuelType: 'gasoline',
          configuration: 'Flat-4' + (model.engine.hp > 200 ? ' Turbo' : '')
        },
        performance: {
          zeroToSixty: 7.5 - (model.engine.hp / 100),
          topSpeed: 110 + (model.engine.hp / 5),
          quarterMile: 15.5 - (model.engine.hp / 135)
        },
        dimensions: {
          length: 180 + (model.bodyStyle === 'suv' ? 8 : 0),
          width: 71,
          height: model.bodyStyle === 'suv' ? 68 : 58,
          wheelbase: 105,
          curbWeight: 3200 + (model.bodyStyle === 'suv' ? 350 : 0)
        },
        fuelEconomy: {
          city: 26 - Math.floor(model.engine.base),
          highway: 33 - Math.floor(model.engine.base),
          combined: 29 - Math.floor(model.engine.base)
        },
        transmission: { type: model.model === 'WRX' && year < 2023 ? 'manual' : 'cvt', speeds: model.model === 'WRX' && year < 2023 ? 6 : 1 },
        driveType: 'AWD',
        price: { msrp: model.msrp + (year - 2020) * 600 }
      });
    });
  });

  // Volkswagen vehicles (Germany)
  const volkswagenModels = [
    { model: 'Jetta', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 1.4, hp: 147, torque: 184 }, msrp: 21990 },
    { model: 'Passat', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 174, torque: 206 }, msrp: 25295 },
    { model: 'Golf', years: [2000, 2005, 2010, 2015, 2020, 2023], bodyStyle: 'hatchback', engine: { base: 1.4, hp: 147, torque: 184 }, msrp: 24190 },
    { model: 'Golf GTI', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'hatchback', engine: { base: 2.0, hp: 241, torque: 273 }, msrp: 30540 },
    { model: 'Tiguan', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.0, hp: 184, torque: 221 }, msrp: 26960 },
    { model: 'Atlas', years: [2018, 2020, 2022, 2023], bodyStyle: 'suv', engine: { base: 3.6, hp: 276, torque: 266 }, msrp: 34760 },
  ];

  volkswagenModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Volkswagen',
        model: model.model,
        year,
        countryOfOrigin: 'Germany',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.engine.base,
          horsepower: model.engine.hp + (year > 2018 ? 7 : 0),
          torque: model.engine.torque + (year > 2018 ? 6 : 0),
          fuelType: 'gasoline',
          configuration: model.engine.base > 2.5 ? 'V6' : 'Inline-4 Turbo'
        },
        performance: {
          zeroToSixty: 7.5 - (model.engine.hp / 105),
          topSpeed: 115 + (model.engine.hp / 5),
          quarterMile: 15.5 - (model.engine.hp / 135)
        },
        dimensions: {
          length: 178 + (model.bodyStyle === 'suv' ? 12 : 0),
          width: 70,
          height: model.bodyStyle === 'suv' ? 67 : 57,
          wheelbase: 104,
          curbWeight: 3100 + (model.bodyStyle === 'suv' ? 450 : 0)
        },
        fuelEconomy: {
          city: 28 - Math.floor(model.engine.base * 1.5),
          highway: 37 - Math.floor(model.engine.base * 1.5),
          combined: 32 - Math.floor(model.engine.base * 1.5)
        },
        transmission: { type: model.model === 'Golf GTI' ? 'dual-clutch' : 'automatic', speeds: model.model === 'Golf GTI' ? 7 : 8 },
        driveType: model.bodyStyle === 'suv' ? 'AWD' : 'FWD',
        price: { msrp: model.msrp + (year - 2020) * 700 }
      });
    });
  });

  // Hyundai vehicles (South Korea)
  const hyundaiModels = [
    { model: 'Elantra', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 147, torque: 132 }, msrp: 21200 },
    { model: 'Sonata', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.5, hp: 191, torque: 181 }, msrp: 26150 },
    { model: 'Tucson', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 187, torque: 178 }, msrp: 27750 },
    { model: 'Santa Fe', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 191, torque: 181 }, msrp: 30150 },
    { model: 'Palisade', years: [2020, 2021, 2022, 2023], bodyStyle: 'suv', engine: { base: 3.8, hp: 291, torque: 262 }, msrp: 35550 },
    { model: 'Ioniq 5', years: [2022, 2023, 2024], bodyStyle: 'suv', engine: { hp: 320, torque: 446 }, msrp: 43650, fuelType: 'electric' },
  ];

  hyundaiModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Hyundai',
        model: model.model,
        year,
        countryOfOrigin: 'South Korea',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.fuelType === 'electric' ? 0 : model.engine.base,
          horsepower: model.engine.hp + (year > 2020 && model.fuelType !== 'electric' ? 8 : 0),
          torque: model.engine.torque + (year > 2020 && model.fuelType !== 'electric' ? 6 : 0),
          fuelType: model.fuelType || 'gasoline',
          configuration: model.fuelType === 'electric' ? 'Dual Electric Motors' : model.engine.base > 3 ? 'V6' : 'Inline-4'
        },
        performance: {
          zeroToSixty: model.fuelType === 'electric' ? 4.5 : 7.5 - (model.engine.hp / 100),
          topSpeed: model.fuelType === 'electric' ? 115 : 115 + (model.engine.hp / 5.5),
          quarterMile: model.fuelType === 'electric' ? 12.8 : 15.5 - (model.engine.hp / 130)
        },
        dimensions: {
          length: 180 + (model.bodyStyle === 'suv' ? 10 : 0),
          width: 73,
          height: model.bodyStyle === 'suv' ? 66 : 57,
          wheelbase: 108,
          curbWeight: model.fuelType === 'electric' ? 4675 : 3200 + (model.bodyStyle === 'suv' ? 450 : 0)
        },
        fuelEconomy: {
          city: model.fuelType === 'electric' ? 98 : 27 - Math.floor(model.engine.base),
          highway: model.fuelType === 'electric' ? 87 : 35 - Math.floor(model.engine.base),
          combined: model.fuelType === 'electric' ? 92 : 31 - Math.floor(model.engine.base)
        },
        transmission: { type: 'automatic', speeds: model.fuelType === 'electric' ? 1 : 8 },
        driveType: model.bodyStyle === 'suv' || model.fuelType === 'electric' ? 'AWD' : 'FWD',
        price: { msrp: model.msrp + (year - 2020) * 800 }
      });
    });
  });

  // Kia vehicles (South Korea)
  const kiaModels = [
    { model: 'Forte', years: [2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 2.0, hp: 147, torque: 132 }, msrp: 19990 },
    { model: 'K5', years: [2011, 2015, 2021, 2023], bodyStyle: 'sedan', engine: { base: 2.5, hp: 191, torque: 181 }, msrp: 25090 },
    { model: 'Sportage', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 187, torque: 178 }, msrp: 26990 },
    { model: 'Sorento', years: [2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.5, hp: 191, torque: 181 }, msrp: 31090 },
    { model: 'Telluride', years: [2020, 2021, 2022, 2023], bodyStyle: 'suv', engine: { base: 3.8, hp: 291, torque: 262 }, msrp: 35890 },
    { model: 'EV6', years: [2022, 2023, 2024], bodyStyle: 'suv', engine: { hp: 320, torque: 446 }, msrp: 47795, fuelType: 'electric' },
    { model: 'Stinger', years: [2018, 2020, 2022, 2023], bodyStyle: 'sedan', engine: { base: 3.3, hp: 368, torque: 376 }, msrp: 37795 },
  ];

  kiaModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Kia',
        model: model.model,
        year,
        countryOfOrigin: 'South Korea',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.fuelType === 'electric' ? 0 : model.engine.base,
          horsepower: model.engine.hp + (year > 2020 && model.fuelType !== 'electric' ? 8 : 0),
          torque: model.engine.torque + (year > 2020 && model.fuelType !== 'electric' ? 6 : 0),
          fuelType: model.fuelType || 'gasoline',
          configuration: model.fuelType === 'electric' ? 'Dual Electric Motors' : model.engine.base > 3 ? 'V6 Twin-Turbo' : 'Inline-4'
        },
        performance: {
          zeroToSixty: model.fuelType === 'electric' ? 4.6 : 7.3 - (model.engine.hp / 105),
          topSpeed: model.fuelType === 'electric' ? 115 : 117 + (model.engine.hp / 5.2),
          quarterMile: model.fuelType === 'electric' ? 12.9 : 15.3 - (model.engine.hp / 135)
        },
        dimensions: {
          length: 182 + (model.bodyStyle === 'suv' ? 8 : 0),
          width: 73,
          height: model.bodyStyle === 'suv' ? 65 : 57,
          wheelbase: 110,
          curbWeight: model.fuelType === 'electric' ? 4603 : 3250 + (model.bodyStyle === 'suv' ? 400 : 0)
        },
        fuelEconomy: {
          city: model.fuelType === 'electric' ? 99 : 26 - Math.floor(model.engine.base),
          highway: model.fuelType === 'electric' ? 88 : 34 - Math.floor(model.engine.base),
          combined: model.fuelType === 'electric' ? 94 : 30 - Math.floor(model.engine.base)
        },
        transmission: { type: 'automatic', speeds: model.fuelType === 'electric' ? 1 : 8 },
        driveType: model.bodyStyle === 'suv' || model.fuelType === 'electric' ? 'AWD' : model.model === 'Stinger' ? 'AWD' : 'FWD',
        price: { msrp: model.msrp + (year - 2020) * 750 }
      });
    });
  });

  // Porsche vehicles (Germany)
  const porscheModels = [
    { model: '911', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'coupe', engine: { base: 3.0, hp: 379, torque: 331 }, msrp: 106100 },
    { model: 'Cayenne', years: [2005, 2010, 2015, 2020, 2023], bodyStyle: 'suv', engine: { base: 3.0, hp: 335, torque: 332 }, msrp: 70650 },
    { model: 'Macan', years: [2015, 2018, 2020, 2023], bodyStyle: 'suv', engine: { base: 2.0, hp: 261, torque: 295 }, msrp: 57500 },
    { model: 'Panamera', years: [2010, 2015, 2020, 2023], bodyStyle: 'sedan', engine: { base: 3.0, hp: 325, torque: 331 }, msrp: 92050 },
    { model: 'Taycan', years: [2020, 2021, 2022, 2023], bodyStyle: 'sedan', engine: { hp: 469, torque: 479 }, msrp: 86700, fuelType: 'electric' },
  ];

  porscheModels.forEach(model => {
    model.years.forEach(year => {
      cars.push({
        id: createId(),
        make: 'Porsche',
        model: model.model,
        year,
        countryOfOrigin: 'Germany',
        bodyStyle: model.bodyStyle,
        engine: {
          displacement: model.fuelType === 'electric' ? 0 : model.engine.base,
          horsepower: model.engine.hp + (year > 2020 ? 15 : 0),
          torque: model.engine.torque + (year > 2020 ? 10 : 0),
          fuelType: model.fuelType || 'gasoline',
          configuration: model.fuelType === 'electric' ? 'Dual Electric Motors' : model.model === '911' ? 'Flat-6 Twin-Turbo' : 'V6 Twin-Turbo'
        },
        performance: {
          zeroToSixty: model.fuelType === 'electric' ? 3.8 : 4.5 - (model.engine.hp / 180),
          topSpeed: model.fuelType === 'electric' ? 143 : 155 + (model.engine.hp / 3),
          quarterMile: model.fuelType === 'electric' ? 12.3 : 12.5 - (model.engine.hp / 170)
        },
        dimensions: {
          length: model.model === '911' ? 178 : 190 + (model.bodyStyle === 'suv' ? 5 : 0),
          width: 73,
          height: model.bodyStyle === 'suv' ? 65 : model.model === '911' ? 51 : 55,
          wheelbase: model.model === '911' ? 96 : 113,
          curbWeight: model.fuelType === 'electric' ? 5120 : 3400 + (model.bodyStyle === 'suv' ? 800 : 0)
        },
        fuelEconomy: {
          city: model.fuelType === 'electric' ? 79 : 19 - Math.floor(model.engine.base),
          highway: model.fuelType === 'electric' ? 84 : 25 - Math.floor(model.engine.base),
          combined: model.fuelType === 'electric' ? 81 : 22 - Math.floor(model.engine.base)
        },
        transmission: { type: model.fuelType === 'electric' ? 'automatic' : 'dual-clutch', speeds: model.fuelType === 'electric' ? 2 : 8 },
        driveType: model.bodyStyle === 'suv' || model.fuelType === 'electric' ? 'AWD' : year > 2016 ? 'AWD' : 'RWD',
        price: { msrp: model.msrp + (year - 2020) * 2500 }
      });
    });
  });

  console.log(`Generated ${cars.length} cars from ${new Set(cars.map(c => c.make)).size} manufacturers`);

  return {
    cars,
    lastUpdated: new Date().toISOString()
  };
};

// Generate and save
const database = generateCarDatabase();
const outputPath = path.join(__dirname, '../data/cars.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!require('fs').existsSync(dir)){
  require('fs').mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

console.log(`\n✅ Database generated successfully!`);
console.log(`📊 Total cars: ${database.cars.length}`);
console.log(`🏢 Manufacturers: ${new Set(database.cars.map(c => c.make)).size}`);
console.log(`📅 Year range: ${Math.min(...database.cars.map(c => c.year))} - ${Math.max(...database.cars.map(c => c.year))}`);
console.log(`💾 Saved to: ${outputPath}`);
