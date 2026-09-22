import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Compare from './Compare';
import { trustDashboard } from '../test/fixtures';
import * as api from '../services/api';
import { useCarStore } from '../stores/carStore';

vi.mock('../stores/carStore');
vi.mock('../services/api', () => ({
  getCarDashboard: vi.fn(),
  compareCars: vi.fn(),
}));

function mockCompareStore(comparedCars: (typeof trustDashboard.car)[]) {
  vi.mocked(useCarStore).mockReturnValue({
    comparedCars,
    removeCarFromComparison: vi.fn(),
    clearComparison: vi.fn(),
    addCarToComparison: vi.fn(),
    replaceComparison: vi.fn(),
    searchResults: [],
    searchQuery: {},
    setSearchQuery: vi.fn(),
    performSearch: vi.fn(),
    isSearching: false,
    searchError: null,
  } as ReturnType<typeof useCarStore>);
}

describe('Compare provenance', () => {
  beforeEach(() => {
    mockCompareStore([trustDashboard.car]);
    vi.mocked(api.getCarDashboard).mockResolvedValue(trustDashboard);
  });

  it('loads full dashboards and marks estimated fields', async () => {
    render(
      <MemoryRouter>
        <Compare />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.getCarDashboard).toHaveBeenCalledWith(trustDashboard.car.id, expect.any(String));
    });

    await waitFor(() => {
      expect(screen.getByText('EFF AVG')).toBeInTheDocument();
    });

    expect(screen.getAllByText('est.').length).toBeGreaterThan(0);
    expect(screen.getByText(/EST\. VALUE/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Estimates only' })).not.toBeInTheDocument();
  });

  it('keeps hook order when leaving the empty compare state', async () => {
    mockCompareStore([]);
    const { rerender } = render(
      <MemoryRouter>
        <Compare />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByText(/Add up to 5 vehicles/i)).toBeInTheDocument();

    mockCompareStore([trustDashboard.car]);
    expect(() =>
      rerender(
        <MemoryRouter>
          <Compare />
        </MemoryRouter>,
      ),
    ).not.toThrow();

    await waitFor(() => {
      expect(api.getCarDashboard).toHaveBeenCalledWith(trustDashboard.car.id, expect.any(String));
    });
  });
});
