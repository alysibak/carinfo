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

describe('Compare provenance', () => {
  beforeEach(() => {
    vi.mocked(useCarStore).mockReturnValue({
      comparedCars: [trustDashboard.car],
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
    vi.mocked(api.getCarDashboard).mockResolvedValue(trustDashboard);
  });

  it('loads full dashboards and marks estimated fields', async () => {
    render(
      <MemoryRouter>
        <Compare />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.getCarDashboard).toHaveBeenCalledWith(trustDashboard.car.id);
    });

    await waitFor(() => {
      expect(screen.getByText('EFF AVG')).toBeInTheDocument();
    });

    expect(screen.getAllByText('est.').length).toBeGreaterThan(0);
    expect(screen.getByText('EST. VALUE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Estimates only' })).not.toBeInTheDocument();
  });
});
