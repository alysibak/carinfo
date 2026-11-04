import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VinDecoder from './VinDecoder';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  decodeVin: vi.fn(),
  apiErrorMessage: () => null,
  searchCars: vi.fn(async () => ({ results: [], total: 0 })),
  getCarDashboard: vi.fn(),
}));

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
});
