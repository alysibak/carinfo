import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VinDecoder from './VinDecoder';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';

vi.mock('../services/api', () => ({
  decodeVin: vi.fn(),
  apiErrorMessage: () => null,
  getCarDashboard: vi.fn(async () => {
    throw new Error('not in this test');
  }),
}));

/** A 2003 Accord version, as the catalog files it. */
function accord(id: string, displacement: number, gearbox: 'automatic' | 'manual'): CarSpecs {
  return {
    id,
    make: 'Honda',
    model: 'Accord',
    year: 2003,
    provenance: {},
    engine: { fuelType: 'gasoline', displacement, cylinders: displacement > 2.5 ? 6 : 4 },
    fuelEconomy: { city: 20, highway: 29, combined: 23 },
    transmission: { type: gearbox, speeds: 5 },
    driveType: 'FWD',
    bodyStyle: 'sedan',
  };
}

async function decode() {
  render(
    <MemoryRouter>
      <VinDecoder />
    </MemoryRouter>,
  );
  const field = screen.getByRole('textbox', { name: /vehicle identification number/i });
  fireEvent.change(field, { target: { value: '1HGCM82633A004352' } });
  fireEvent.click(screen.getByRole('button', { name: /^Decode$/i }));
  // The decode's own table: a car card's title names the car too.
  await screen.findByText(/As built, by NHTSA/i);
}

describe('VinDecoder', () => {
  beforeEach(() => {
    vi.mocked(api.decodeVin).mockReset();
    vi.mocked(api.decodeVin).mockResolvedValue({
      vin: '1HGCM82633A004352',
      year: 2003,
      make: 'HONDA',
      model: 'Accord',
      trim: 'EX',
      bodyClass: 'Sedan/Saloon',
      driveType: 'FWD/Front-Wheel Drive',
      plantCity: 'MARYSVILLE',
      plantCountry: 'UNITED STATES (USA)',
      decodedClean: true,
      engine: { fuelPrimary: 'Gasoline', cylinders: 6, displacementL: 3.0 },
    });
  });

  it('decodes a typed VIN and shows what the car was built as', async () => {
    render(
      <MemoryRouter>
        <VinDecoder />
      </MemoryRouter>,
    );

    const field = screen.getByRole('textbox', { name: /vehicle identification number/i });
    fireEvent.change(field, { target: { value: '1HGCM82633A004352' } });
    fireEvent.click(screen.getByRole('button', { name: /^Decode$/i }));

    await waitFor(() => expect(api.decodeVin).toHaveBeenCalledWith('1HGCM82633A004352'));
    expect(await screen.findByRole('heading', { name: /2003 HONDA Accord/i })).toBeInTheDocument();
    expect(screen.getByText(/As built, by NHTSA/i)).toBeInTheDocument();
  });

  it('leads with the car the VIN is, and a way to its page', async () => {
    const v6 = accord('accord-30-auto', 3, 'automatic');
    vi.mocked(api.decodeVin).mockResolvedValueOnce({
      vin: '1HGCM82633A004352',
      decodedClean: true,
      year: 2003,
      make: 'HONDA',
      model: 'Accord',
      engine: { cylinders: 6, displacementL: 3 },
      catalog: { cars: [v6], basis: 'version' },
    });
    await decode();
    expect(screen.getByRole('heading', { name: 'This car on CarInfo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open this car’s page' })).toHaveAttribute(
      'href',
      '/car/accord-30-auto',
    );
  });

  it('offers the versions the VIN fits when it does not say which', async () => {
    vi.mocked(api.decodeVin).mockResolvedValueOnce({
      vin: '1HGCM82633A004352',
      decodedClean: true,
      year: 2003,
      make: 'HONDA',
      model: 'Accord',
      engine: { cylinders: 6, displacementL: 3 },
      catalog: {
        cars: [accord('accord-30-auto', 3, 'automatic'), accord('accord-30-manual', 3, 'manual')],
        basis: 'version',
      },
    });
    await decode();
    expect(screen.getByRole('heading', { name: 'Which one is it?' })).toBeInTheDocument();
    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.startsWith('/car/'));
    expect(hrefs).toEqual(expect.arrayContaining(['/car/accord-30-auto', '/car/accord-30-manual']));
    expect(screen.queryByRole('link', { name: 'Open this car’s page' })).not.toBeInTheDocument();
  });

  it('says so when no car here is the VIN', async () => {
    vi.mocked(api.decodeVin).mockResolvedValueOnce({
      vin: '1HGCM82633A004352',
      decodedClean: true,
      year: 2003,
      make: 'HONDA',
      model: 'Accord',
      engine: {},
      catalog: null,
    });
    await decode();
    expect(screen.getByText(/No car here matches this VIN closely enough/)).toBeInTheDocument();
  });
});
