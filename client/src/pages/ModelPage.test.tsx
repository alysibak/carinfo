import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ModelPage from './ModelPage';
import * as api from '../services/api';
import { HttpError } from '../services/http';
import { sparseDashboard } from '../test/fixtures';
import type { ModelOverview } from '../types/car.types';

vi.mock('../services/api', () => ({ getModelOverview: vi.fn() }));

const lead = { ...sparseDashboard.car, make: 'Toyota', model: 'Camry', year: 2026 };
const overview: ModelOverview = {
  make: 'Toyota',
  name: 'Camry',
  path: '/models/toyota/camry',
  first: 2023,
  last: 2026,
  onSale: true,
  lead,
  years: [
    {
      year: 2026,
      carId: 'camry-2026',
      configurations: 5,
      price: { min: 31500, max: 31500 },
      combinedMpg: 51,
      fuelTypes: ['hybrid'],
      bodyStyles: ['sedan'],
      generation: 'XV80 · 9th generation (2025 on)',
      changes: ['New generation: XV80 · 9th generation', 'Gasoline dropped'],
    },
    {
      year: 2024,
      carId: 'camry-2024',
      configurations: 9,
      recalls: 3,
      complaints: 481,
      fuelTypes: ['gasoline'],
      bodyStyles: ['sedan'],
      generation: 'XV70 · 8th generation (2018–2024)',
    },
    {
      year: 2023,
      carId: 'camry-2023',
      configurations: 10,
      recalls: 4,
      complaints: 632,
      fuelTypes: ['gasoline'],
      bodyStyles: ['sedan'],
      generation: 'XV70 · 8th generation (2018–2024)',
    },
  ],
  generations: [],
  rivals: [{ make: 'Honda', name: 'Accord', path: '/models/honda/accord' }],
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/models/:make/:model" element={<ModelPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ModelPage', () => {
  it('lists every year by generation, each opening that year’s car, and the rivals’ pages', async () => {
    vi.mocked(api.getModelOverview).mockResolvedValue(overview);
    renderAt('/models/toyota/camry');

    // The page loads lazily; under a full parallel run one second was not always enough.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Toyota Camry' }, { timeout: 5000 }),
    ).toBeVisible();
    expect(api.getModelOverview).toHaveBeenCalledWith('toyota', 'camry', expect.anything());
    expect(screen.getByRole('heading', { name: /^XV70/ })).toBeVisible();
    expect(screen.getByRole('link', { name: '2024 Toyota Camry' })).toHaveAttribute(
      'href',
      '/car/camry-2024',
    );
    // The row reads the year's figures; the newest year is also the header's link.
    const newest = screen.getAllByRole('link', { name: '2026 Toyota Camry' });
    expect(
      newest.some((link) =>
        /Est\. value ~\$32k · from 4\.6 L\/100 km/.test(link.textContent ?? ''),
      ),
    ).toBe(true);
    expect(screen.getByRole('link', { name: 'Honda Accord' })).toHaveAttribute(
      'href',
      '/models/honda/accord',
    );
    // What changed from the year before.
    expect(screen.getByText('Gasoline dropped')).toBeVisible();
    // The years with the most complaints and recalls, most first.
    expect(
      screen.getByText('Most owner complaints to NHTSA: 2023 (632), 2024 (481)'),
    ).toBeVisible();
    expect(screen.getByText('Most recalls in Canada: 2023 (4), 2024 (3)')).toBeVisible();
    // The title is set in an effect, which can land after the heading under load.
    await waitFor(() =>
      expect(document.title).toBe('Toyota Camry: every year, 2023–2026 | CarInfo'),
    );
  });

  it('says so when the model is not on file', async () => {
    vi.mocked(api.getModelOverview).mockRejectedValue(new HttpError('Model not found', 404));
    renderAt('/models/toyota/hovercraft');
    expect(await screen.findByText('Model not found', {}, { timeout: 5000 })).toBeVisible();
  });
});
