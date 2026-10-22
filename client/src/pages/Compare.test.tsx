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
      expect(screen.getByText('Fuel use')).toBeInTheDocument();
    });

    expect(screen.getAllByText('est.').length).toBeGreaterThan(0);
    expect(screen.getByText('Est. value')).toBeInTheDocument();
    // Litres first, with EPA's figure beneath: 33 mpg is 7.1 L/100 km.
    expect(screen.getByText('7.1 L/100 km')).toBeInTheDocument();
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
    expect(screen.getByText(/Put up to five cars side by side/i)).toBeInTheDocument();

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

describe('Compare trunks', () => {
  function withLuggage(id: string, bodyStyle: 'sedan' | 'hatchback', cuFt: number) {
    const car = {
      ...trustDashboard.car,
      id,
      bodyStyle,
      epa: { ...trustDashboard.car.epa, luggageVolumeCuFt: cuFt },
    };
    return { ...trustDashboard, car };
  }

  async function trunkRow(dashboards: ReturnType<typeof withLuggage>[]) {
    mockCompareStore(dashboards.map((d) => d.car));
    vi.mocked(api.getCarDashboard).mockImplementation(async (id: string) =>
      dashboards.find((d) => d.car.id === id)!,
    );
    render(
      <MemoryRouter>
        <Compare />
      </MemoryRouter>,
    );
    const label = await screen.findByText('Trunk or cargo');
    return label.closest('tr')!;
  }

  it('does not rank a hatchback’s cargo space against a sedan’s trunk', async () => {
    const row = await trunkRow([
      withLuggage('sedan', 'sedan', 14),
      withLuggage('hatch', 'hatchback', 26),
    ]);
    await waitFor(() => expect(row.textContent).toContain('736 L'));
    expect(row.textContent).not.toContain('Best');
  });

  it('ranks one trunk against another', async () => {
    const row = await trunkRow([withLuggage('a', 'sedan', 14), withLuggage('b', 'sedan', 17)]);
    await waitFor(() => expect(row.textContent).toContain('Best'));
  });
});
