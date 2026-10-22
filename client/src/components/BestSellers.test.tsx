import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../services/api';
import BestSellers from './BestSellers';

vi.mock('../services/api', () => ({ getBestSellers: vi.fn() }));

describe('BestSellers', () => {
  it('ranks the best sellers by units sold, names the count, and opens each model', async () => {
    vi.mocked(api.getBestSellers).mockResolvedValue({
      year: 2025,
      source: { name: 'The Car Guide', url: 'https://example.com/top-10' },
      models: [
        {
          rank: 1,
          sales: 'Ford F-Series',
          sold: 138470,
          label: 'Ford F-150',
          path: '/models/ford/f-150',
          newest: {
            year: 2026,
            carId: 'f150-2026',
            configurations: 30,
            combinedMpg: 24,
            safetyStars: 5,
            fuelTypes: ['gasoline'],
            bodyStyles: ['truck'],
          },
        },
      ],
    });
    render(
      <MemoryRouter>
        <BestSellers />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Ford F-Series')).toBeInTheDocument();
    expect(screen.getByText('138,470 sold')).toBeInTheDocument();
    // The sales count is the family's; the link is the F-150's page.
    const link = screen.getByRole('link', {
      name: '1. Ford F-Series, 138,470 sold: every Ford F-150 year',
    });
    expect(link).toHaveAttribute('href', '/models/ford/f-150');
    expect(screen.getByText('from 9.8 L/100 km')).toBeInTheDocument();
    expect(screen.getByText('NHTSA 5/5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The Car Guide' })).toHaveAttribute(
      'href',
      'https://example.com/top-10',
    );
  });
});
