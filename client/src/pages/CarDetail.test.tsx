import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CarDetail from './CarDetail';
import { trustDashboard } from '../test/fixtures';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  getCarDashboard: vi.fn(),
  getSimilarCars: vi.fn(async () => []),
  getSiblingConfigs: vi.fn(async () => []),
}));

vi.mock('../hooks/useAccountStatus', () => ({
  useAccountStatus: () => null,
}));

describe('CarDetail', () => {
  beforeEach(() => {
    vi.mocked(api.getCarDashboard).mockResolvedValue(trustDashboard);
  });

  it('loads the dossier and keeps estimated costs labeled', async () => {
    render(
      <MemoryRouter initialEntries={[`/car/${trustDashboard.car.id}`]}>
        <Routes>
          <Route path="/car/:id" element={<CarDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.getCarDashboard).toHaveBeenCalled();
    });
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Running costs/i })).toBeInTheDocument();
  });
});
