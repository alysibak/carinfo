import { describe, expect, it } from 'vitest';
import type { Car } from '../types/car.types.js';
import { estimateEvHorsepower } from './ev-power-estimates.js';

const ev = (make: string, model: string, year: number): Car =>
  ({
    id: `${make}-${model}-${year}`,
    make,
    model,
    year,
    provenance: {},
    engine: { fuelType: 'electric' },
    fuelEconomy: { combined: 100 },
    transmission: { type: 'automatic' },
    driveType: 'AWD',
    bodyStyle: 'sedan',
  }) as Car;

const hp = (make: string, model: string, year: number) =>
  estimateEvHorsepower(ev(make, model, year));

describe('estimateEvHorsepower', () => {
  it('rates each trim, not one figure per model', () => {
    // Every Taycan read 402 hp.
    expect(hp('Porsche', 'Taycan Turbo S', 2022)).toBe(750);
    expect(hp('Porsche', 'Taycan Turbo S', 2025)).toBe(938);
    expect(hp('Porsche', 'Taycan 4S Perf Battery Plus', 2023)).toBe(562);
    expect(hp('Porsche', 'Taycan Performance Battery', 2023)).toBe(402);
    expect(hp('Porsche', 'Taycan Turbo GT', 2025)).toBe(1019);
    // Every BMW i model read 335, every Mercedes EQ 329.
    expect(hp('BMW', 'i4 eDrive35 Gran Coupe (18 inch Wheels)', 2024)).toBe(281);
    expect(hp('BMW', 'i7 M70 xDrive Sedan (20 inch Wheels)', 2024)).toBe(650);
    expect(hp('Mercedes-Benz', 'EQB 250 Plus', 2024)).toBe(188);
    expect(hp('Mercedes-Benz', 'EQS 580 4matic (SUV)', 2024)).toBe(536);
    expect(hp('Mercedes-Benz', 'EQS 580 4matic', 2024)).toBe(516);
    // Every Ioniq 5 read 320, every Mach-E 266, a Lucid Air Sapphire 480.
    expect(hp('Hyundai', 'Ioniq 5 Standard range RWD', 2024)).toBe(168);
    expect(hp('Hyundai', 'Ioniq 5 N', 2025)).toBe(641);
    expect(hp('Ford', 'Mustang Mach-E GT', 2023)).toBe(480);
    expect(hp('Ford', 'Mustang Mach-E AWD Extended', 2023)).toBe(346);
    expect(hp('Lucid', 'Air Sapphire AWD', 2024)).toBe(1234);
    expect(hp('Tesla', 'Model S Plaid (21in wheels)', 2024)).toBe(1020);
    expect(hp('Rivian', 'R1T Quad Max (22in)', 2025)).toBe(1025);
    expect(hp('Rivian', 'R1T Performance Dual Large', 2025)).toBe(665);
  });

  it('gives no figure where the name does not say which version it is', () => {
    // Tesla's 2012-21 Model S came in a dozen outputs; each read 670.
    expect(hp('Tesla', 'Model S AWD - 85D', 2015)).toBeNull();
    expect(hp('Hyundai', 'Ioniq 5 Robo taxi', 2025)).toBeNull();
    expect(hp('Volkswagen', 'ID.4 Pro', 2024)).toBeNull();
    // EPA's doubled spaces do not hide a name.
    expect(hp('Tesla', 'Model 3 Long Range  AWD', 2018)).toBe(346);
  });

  it('leaves combustion cars and rated EVs alone', () => {
    expect(
      estimateEvHorsepower({
        ...ev('Porsche', 'Taycan Turbo', 2022),
        engine: { fuelType: 'gasoline' },
      }),
    ).toBeNull();
    expect(
      estimateEvHorsepower({
        ...ev('Porsche', 'Taycan Turbo', 2022),
        engine: { fuelType: 'electric', horsepower: 616 },
      }),
    ).toBeNull();
  });
});
