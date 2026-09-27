import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../services/api';
import SimilarCars from './SimilarCars';
import { sparseDashboard } from '../test/fixtures';

vi.mock('../services/api', () => ({ getSimilarCars: vi.fn() }));
const getSimilarCars = vi.mocked(api.getSimilarCars);

describe('SimilarCars', () => {
  it('links to the full list of rivals', async () => {
    const car = sparseDashboard.car;
    const rival = { ...car, id: 'rival', make: 'Honda', model: 'Civic' };
    getSimilarCars.mockResolvedValue([rival]);
    render(
      <MemoryRouter>
        <SimilarCars car={car} />
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', {
      name: /More rivals of the 2020 Toyota Corolla/,
    });
    // The search reads "cars like …" as the rivals of the car named.
    expect(link.getAttribute('href')).toBe(
      `/home?q=${encodeURIComponent('cars like 2020 toyota corolla')}`,
    );
  });

  it('shows no section, and no link, when there are no rivals', async () => {
    getSimilarCars.mockResolvedValue([]);
    const { container } = render(
      <MemoryRouter>
        <SimilarCars car={sparseDashboard.car} />
      </MemoryRouter>,
    );
    await vi.waitFor(() => expect(container.querySelector('section')).toBeNull());
  });
});
