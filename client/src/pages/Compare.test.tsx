import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Compare from './Compare';
import { trustDashboard } from '../test/fixtures';
import * as api from '../services/api';
import { useCarStore } from '../stores/carStore';

vi.mock('../stores/carStore');
vi.mock('../services/api', () => ({
  getCarDashboard: vi.fn(),
}));

describe('Compare provenance', () => {
  beforeEach(() => {
    vi.mocked(useCarStore).mockReturnValue({
      comparedCars: [trustDashboard.car],
      removeCarFromComparison: vi.fn(),
      clearComparison: vi.fn(),
      addCarToComparison: vi.fn(),
      searchResults: [],
      searchQuery: {},
      setSearchQuery: vi.fn(),
      performSearch: vi.fn(),
      isSearching: false,
      searchError: null,
    } as ReturnType<typeof useCarStore>);
    vi.mocked(api.getCarDashboard).mockResolvedValue(trustDashboard);
  });

  it('loads full dashboards and renders provenance chips', async () => {
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

    expect(screen.getAllByText('EPA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Est.').length).toBeGreaterThan(0);
  });

  it('trust filter limits rows to estimates', async () => {
    render(
      <MemoryRouter>
        <Compare />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('EST. VALUE')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Estimates only' }));

    await waitFor(() => {
      expect(screen.getByText('EST. VALUE')).toBeInTheDocument();
      expect(screen.queryByText('EFF AVG')).not.toBeInTheDocument();
    });
  });
});
