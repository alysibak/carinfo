import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarSpecs } from '../types/car.types';
import { useGarageStore } from '../stores/garageStore';
import DreamGarage from './DreamGarage';

vi.mock('../services/api', () => ({
  getCarRecords: vi.fn((id: string) =>
    Promise.resolve(
      id === 'thirsty'
        ? { recalls: 3, complaints: null, complaintPart: null, theft: null }
        : { recalls: null, complaints: null, complaintPart: null, theft: null },
    ),
  ),
}));
vi.mock('../services/accountApi', () => ({
  getAccountStatus: vi.fn(() => Promise.resolve(null)),
  isGarageLimitError: () => false,
}));

const car = (id: string, model: string, mpg: number, hp: number, runningCostCad: number) =>
  ({
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
    runningCostCad,
  }) as unknown as CarSpecs;

describe('DreamGarage', () => {
  beforeEach(() => {
    useGarageStore.setState({
      cars: [car('thrifty', 'Prius', 57, 196, 6100), car('thirsty', 'Tundra', 20, 389, 9800)],
      syncMode: 'local',
      plan: 'free',
    });
  });

  it('says which saved car leads, and on what', () => {
    render(
      <MemoryRouter>
        <DreamGarage />
      </MemoryRouter>,
    );
    const tile = (label: string) => screen.getByText(label).closest('div')!;
    expect(within(tile('Lowest fuel use')).getByText('4.1')).toBeInTheDocument();
    expect(within(tile('Lowest fuel use')).getByText('2024 Toyota Prius')).toBeInTheDocument();
    expect(within(tile('Most power')).getByText('2024 Toyota Tundra')).toBeInTheDocument();
    expect(
      within(tile('Cheapest to run (est.)')).getByText('2024 Toyota Prius'),
    ).toBeInTheDocument();
  });

  it('puts a saved car’s recalls inside its own card', async () => {
    render(
      <MemoryRouter>
        <DreamGarage />
      </MemoryRouter>,
    );
    const recalls = await screen.findByRole('link', { name: /3 recalls in Canada/ });
    expect(recalls.closest('article')).toHaveTextContent('2024 Toyota Tundra');
  });
});
