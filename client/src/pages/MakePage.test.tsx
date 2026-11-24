import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MakePage from './MakePage';
import * as api from '../services/api';
import type { MakeOverview } from '../types/car.types';

vi.mock('../services/api', () => ({ getMakeOverview: vi.fn() }));

const toyota: MakeOverview = {
  make: 'Toyota',
  path: '/makes/toyota',
  first: 1995,
  last: 2027,
  models: [
    {
      name: 'RAV4',
      path: '/models/toyota/rav4',
      first: 1996,
      last: 2026,
      onSale: true,
      bodyStyles: ['suv'],
      fuelTypes: ['hybrid', 'plug-in hybrid'],
      combinedMpg: 42.8,
    },
    {
      name: 'Camry',
      path: '/models/toyota/camry',
      first: 1995,
      last: 2027,
      onSale: true,
      bodyStyles: ['sedan'],
      fuelTypes: ['hybrid'],
      combinedMpg: 51,
    },
    {
      name: 'Echo',
      path: '/models/toyota/echo',
      first: 2000,
      last: 2005,
      onSale: false,
      bodyStyles: ['sedan'],
      fuelTypes: ['gasoline'],
    },
  ],
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/makes/:make" element={<MakePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MakePage', () => {
  beforeEach(() => vi.mocked(api.getMakeOverview).mockResolvedValue(toyota));

  it('lists the models on sale with a figure each, then the earlier ones', async () => {
    renderAt('/makes/toyota');
    expect(await screen.findByRole('heading', { level: 1, name: 'Toyota' })).toBeVisible();
    expect(api.getMakeOverview).toHaveBeenCalledWith('toyota');
    expect(screen.getByText(/3 models on file · 1995–2027 · 2 on sale/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Toyota RAV4/ })).toHaveAttribute(
      'href',
      '/models/toyota/rav4',
    );
    expect(screen.getByText('from 5.5 L/100 km')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Earlier models' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Toyota Echo/ })).toHaveAttribute(
      'href',
      '/models/toyota/echo',
    );
    expect(screen.getByRole('link', { name: 'Makes' })).toHaveAttribute('href', '/makes');
  });

  it('narrows a long list to a shape in one tap', async () => {
    renderAt('/makes/toyota');
    fireEvent.click(await screen.findByRole('button', { name: 'SUVs' }));
    expect(screen.getByRole('link', { name: /Toyota RAV4/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Toyota Camry/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Earlier models' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByRole('link', { name: /Toyota Camry/ })).toBeVisible();
  });
});
