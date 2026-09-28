import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../services/api';
import CatalogueStats from './CatalogueStats';

vi.mock('../services/api', () => ({ getStatistics: vi.fn() }));
const getStatistics = vi.mocked(api.getStatistics);

function renderStats() {
  return render(
    <MemoryRouter>
      <CatalogueStats />
    </MemoryRouter>,
  );
}

describe('CatalogueStats', () => {
  it('shows the live counts, each labelled for what it counts', async () => {
    getStatistics.mockResolvedValue({
      totalCars: 35823,
      totalModels: 1096,
      totalMakes: 91,
      yearRange: { min: 1995, max: 2027 },
    } as Awaited<ReturnType<typeof api.getStatistics>>);
    renderStats();
    expect(await screen.findByText('35,823')).toBeInTheDocument();
    expect(screen.getByText('1,096')).toBeInTheDocument();
    expect(screen.getByText('versions EPA tested')).toBeInTheDocument();
    expect(screen.getByText('1995–2027')).toBeInTheDocument();
  });

  it('survives a cached response from before the model count existed', async () => {
    // Production crashed on exactly this: a browser's copy without totalModels.
    getStatistics.mockResolvedValue({
      totalCars: 35823,
      totalMakes: 91,
      yearRange: { min: 1995, max: 2027 },
    } as unknown as Awaited<ReturnType<typeof api.getStatistics>>);
    renderStats();
    expect(await screen.findByText('35,823')).toBeInTheDocument();
    expect(screen.getByText('1,000+')).toBeInTheDocument();
  });
});
