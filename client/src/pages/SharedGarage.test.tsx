import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import SharedGarage from './SharedGarage';

vi.mock('../services/api', () => ({
  compareCars: vi.fn(async () => [
    car('thrifty', 'Prius', 57, 196),
    car('thirsty', 'Tundra', 20, 389),
  ]),
  getCarRecords: vi.fn((id: string) =>
    Promise.resolve(
      id === 'thirsty'
        ? { recalls: 2, complaints: null, complaintPart: null, theft: null }
        : { recalls: null, complaints: null, complaintPart: null, theft: null },
    ),
  ),
}));

function car(id: string, model: string, mpg: number, hp: number): CarSpecs {
  return {
    id,
    make: 'Toyota',
    model,
    year: 2024,
    provenance: {},
    engine: { fuelType: 'gasoline', horsepower: hp },
    fuelEconomy: { city: mpg, highway: mpg, combined: mpg },
    transmission: { type: 'automatic' },
    driveType: 'FWD',
    bodyStyle: 'sedan',
  } as unknown as CarSpecs;
}

describe('SharedGarage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows how the shared cars differ and a recall alert', async () => {
    render(
      <MemoryRouter initialEntries={['/shared-garage?cars=thrifty,thirsty']}>
        <Routes>
          <Route path="/shared-garage" element={<SharedGarage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/How these cars differ/i)).toBeInTheDocument();
    expect(await screen.findByText(/One shared car has recalls in Canada/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2024 Toyota Tundra/i })).toHaveAttribute(
      'href',
      '/car/thirsty#recalls',
    );
  });
});
