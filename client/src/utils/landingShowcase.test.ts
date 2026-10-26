import { describe, expect, it } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { pickHeroPreviewCar } from './landingShowcase';

function car(
  id: string,
  model: string,
  extra: {
    photo?: { otherYear?: boolean };
    stars?: number;
    hpSource?: string;
  } = {},
): CarSpecs {
  return {
    id,
    make: 'Toyota',
    model,
    year: 2025,
    trim: model.toLowerCase(),
    price: { msrp: 30000 },
    fuelEconomy: { city: 50, highway: 50, combined: 50 },
    engine: { horsepower: 200, fuelType: 'gasoline' },
    safetyRating: extra.stars ? { overall: extra.stars } : undefined,
    photo: extra.photo
      ? {
          src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/x.jpg/500px-x.jpg',
          credit: 'A. Person, CC BY-SA 4.0',
          ...(extra.photo.otherYear ? { otherYear: { year: 2023, generation: [2018, 2024] } } : {}),
        }
      : undefined,
    provenance: { 'engine.horsepower': extra.hpSource ?? 'epa' },
  } as unknown as CarSpecs;
}

describe('pickHeroPreviewCar', () => {
  it('shows a car with its own photo and stars before a better-known name without them', () => {
    const picked = pickHeroPreviewCar([
      car('camry', 'Camry'),
      car('sienna', 'Sienna', { photo: {}, stars: 5 }),
    ]);
    expect(picked?.id).toBe('sienna');
  });

  it('takes the better-known name among cars just as complete', () => {
    const picked = pickHeroPreviewCar([
      car('sienna', 'Sienna', { photo: {}, stars: 5 }),
      car('rav4', 'RAV4', { photo: {}, stars: 5 }),
      car('camry', 'Camry', { photo: {}, stars: 5 }),
    ]);
    expect(picked?.id).toBe('camry');
  });

  it('puts its own year’s photo and measured power ahead of another year’s and an estimate', () => {
    const picked = pickHeroPreviewCar([
      car('older-photo', 'Camry', { photo: { otherYear: true }, stars: 5 }),
      car('estimated', 'Camry', { photo: {}, stars: 5, hpSource: 'estimated' }),
      car('whole', 'Corolla', { photo: {}, stars: 5 }),
    ]);
    expect(picked?.id).toBe('whole');
  });

  it('finds none among none', () => {
    expect(pickHeroPreviewCar([])).toBeNull();
  });
});
