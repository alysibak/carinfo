import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ModelYearPage from './ModelYearPage';
import * as api from '../services/api';
import { HttpError } from '../services/http';
import { sparseDashboard } from '../test/fixtures';
import type { ModelYearOverview } from '../types/car.types';

vi.mock('../services/api', () => ({ getModelYearOverview: vi.fn() }));

const gas = {
  ...sparseDashboard.car,
  id: 'civic-gas',
  make: 'Honda',
  model: 'Civic 4Dr',
  year: 2024,
  engine: { ...sparseDashboard.car.engine, fuelType: 'gasoline' as const, horsepower: 158 },
  fuelEconomy: { city: 30, highway: 38, combined: 33 },
};
const hybrid = {
  ...sparseDashboard.car,
  id: 'civic-hybrid',
  make: 'Honda',
  model: 'Civic 4Dr',
  year: 2024,
  engine: { ...sparseDashboard.car.engine, fuelType: 'hybrid' as const, horsepower: 200 },
  fuelEconomy: { city: 50, highway: 52, combined: 51 },
};

const overview: ModelYearOverview = {
  make: 'Honda',
  name: 'Civic',
  path: '/models/honda/civic/2024',
  modelPath: '/models/honda/civic',
  year: 2024,
  summary: {
    year: 2024,
    carId: 'civic-gas',
    configurations: 2,
    fuelTypes: ['gasoline', 'hybrid'],
    bodyStyles: ['sedan'],
  },
  cars: [gas, hybrid],
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/models/:make/:model/:year" element={<ModelYearPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ModelYearPage', () => {
  it('lists the year’s configurations and how they differ', async () => {
    vi.mocked(api.getModelYearOverview).mockResolvedValue(overview);
    renderAt('/models/honda/civic/2024');

    expect(
      await screen.findByRole('heading', { level: 1, name: '2024 Honda Civic' }),
    ).toBeVisible();
    expect(api.getModelYearOverview).toHaveBeenCalledWith(
      'honda',
      'civic',
      2024,
      expect.anything(),
    );
    expect(screen.getByText(/How the versions differ/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Every year of the Honda Civic/i })).toHaveAttribute(
      'href',
      '/models/honda/civic',
    );
  });

  it('says the model year is missing when the API returns 404', async () => {
    vi.mocked(api.getModelYearOverview).mockRejectedValue(
      new HttpError('Model year not found', 404),
    );
    renderAt('/models/honda/civic/1995');

    expect(await screen.findByRole('heading', { name: /Model year not found/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /Back to the model/i })).toHaveAttribute(
      'href',
      '/models/honda/civic',
    );
  });

  it('finds a version among many by what tells them apart, keeping the picks in the address', async () => {
    const version = (id: string, fuelType: 'gasoline' | 'hybrid', driveType: 'FWD' | 'AWD') => ({
      ...gas,
      id,
      model: 'Civic 4Dr',
      engine: { ...gas.engine, fuelType },
      driveType,
    });
    const many: ModelYearOverview = {
      ...overview,
      summary: { ...overview.summary, configurations: 4 },
      cars: [
        version('gas-fwd', 'gasoline', 'FWD'),
        version('gas-awd', 'gasoline', 'AWD'),
        version('hybrid-fwd', 'hybrid', 'FWD'),
        version('hybrid-awd', 'hybrid', 'AWD'),
      ],
    };
    vi.mocked(api.getModelYearOverview).mockResolvedValue(many);
    function Where() {
      const location = useLocation();
      return <p data-testid="where">{location.search}</p>;
    }
    render(
      <MemoryRouter initialEntries={['/models/honda/civic/2024']}>
        <Routes>
          <Route path="/models/:make/:model/:year" element={<ModelYearPage />} />
        </Routes>
        <Where />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Find your version' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /Civic/ }).length).toBeGreaterThanOrEqual(4);

    fireEvent.click(screen.getByRole('button', { name: /^Hybrid/ }));
    fireEvent.click(screen.getByRole('button', { name: /^AWD/ }));
    expect(screen.getByText('1 version fits')).toBeVisible();
    expect(screen.getByTestId('where')).toHaveTextContent('?power=Hybrid&drive=AWD');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('where')).toBeEmptyDOMElement();
  });
});
