import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Compare from './Compare';
import { trustDashboard } from '../test/fixtures';
import * as api from '../services/api';
import { useCarStore } from '../stores/carStore';

vi.mock('../stores/carStore');
vi.mock('../services/api', () => ({
  getCarDashboard: vi.fn(),
  compareCars: vi.fn(),
  getMatchups: vi.fn(async () => []),
  getVsPage: vi.fn(),
}));

function mockCompareStore(comparedCars: (typeof trustDashboard.car)[]) {
  const replaceComparison = vi.fn();
  const store = {
    comparedCars,
    removeCarFromComparison: vi.fn(),
    clearComparison: vi.fn(),
    addCarToComparison: vi.fn(),
    replaceComparison,
    searchResults: [],
    searchQuery: {},
    setSearchQuery: vi.fn(),
    performSearch: vi.fn(),
    isSearching: false,
    searchError: null,
  } as ReturnType<typeof useCarStore>;
  vi.mocked(useCarStore).mockReturnValue(store);
  return { replaceComparison };
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
      expect(api.getCarDashboard).toHaveBeenCalledWith(
        trustDashboard.car.id,
        expect.any(String),
        null,
      );
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
      expect(api.getCarDashboard).toHaveBeenCalledWith(
        trustDashboard.car.id,
        expect.any(String),
        null,
      );
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

describe('Compare match-ups', () => {
  it('puts a match-up’s cars side by side in one tap', async () => {
    const store = mockCompareStore([]);
    vi.mocked(api.getMatchups).mockResolvedValue([
      {
        label: 'Compact cars',
        year: 2026,
        cars: [
          { label: 'Honda Civic', carId: 'civic-2026' },
          { label: 'Toyota Corolla', carId: 'corolla-2026' },
        ],
      },
    ]);
    vi.mocked(api.compareCars).mockResolvedValue([trustDashboard.car]);
    render(
      <MemoryRouter>
        <Compare />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Compact cars/ }));
    expect(api.compareCars).toHaveBeenCalledWith(['civic-2026', 'corolla-2026']);
    await waitFor(() => expect(store.replaceComparison).toHaveBeenCalledWith([trustDashboard.car]));
  });
});

describe('Compare head to head', () => {
  const vsPage = {
    path: '/compare/toyota-rav4-vs-honda-cr-v',
    label: 'Toyota RAV4 vs Honda CR-V',
    curated: true,
    year: 2026,
    cars: [
      { label: 'Toyota RAV4', carId: 'rav4-2026', year: 2026, modelPath: '/models/toyota/rav4' },
      { label: 'Honda CR-V', carId: 'crv-2026', year: 2026, modelPath: '/models/honda/cr-v' },
    ],
    related: [{ label: 'Toyota RAV4 vs Mazda CX-5', path: '/compare/toyota-rav4-vs-mazda-cx-5' }],
  } as unknown as Awaited<ReturnType<typeof api.getVsPage>>;
  const rav4 = { ...trustDashboard.car, id: 'rav4-2026' };
  const crv = { ...trustDashboard.car, id: 'crv-2026' };

  function Where() {
    const location = useLocation();
    return <p data-testid="where">{location.pathname + location.search}</p>;
  }

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare/:pair" element={<Compare />} />
        </Routes>
        <Where />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    vi.mocked(api.getVsPage).mockResolvedValue(vsPage);
    vi.mocked(api.compareCars).mockResolvedValue([rav4, crv]);
    vi.mocked(api.getCarDashboard).mockResolvedValue(trustDashboard);
  });

  it('loads a match-up’s two cars under its name, in its own order', async () => {
    // As the store reads once they are in.
    const store = mockCompareStore([rav4, crv]);
    renderAt('/compare/honda-cr-v-vs-toyota-rav4');
    await waitFor(() => expect(store.replaceComparison).toHaveBeenCalledWith([rav4, crv]));
    expect(api.getVsPage).toHaveBeenCalledWith('honda-cr-v-vs-toyota-rav4');
    expect(api.compareCars).toHaveBeenCalledWith(['rav4-2026', 'crv-2026']);
    // The other order leads to the match-up's own address.
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/compare/toyota-rav4-vs-honda-cr-v'),
    );
  });

  it('titles the page with the pair and links the other match-ups', async () => {
    mockCompareStore([rav4, crv]);
    renderAt('/compare/toyota-rav4-vs-honda-cr-v');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Toyota RAV4 vs Honda CR-V' }),
    ).toBeVisible();
    expect(document.title).toBe('Toyota RAV4 vs Honda CR-V (2026) | CarInfo');
    expect(screen.getByText('The 2026 models, side by side')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Toyota RAV4 vs Mazda CX-5' })).toHaveAttribute(
      'href',
      '/compare/toyota-rav4-vs-mazda-cx-5',
    );
    expect(screen.getByTestId('where')).toHaveTextContent('/compare/toyota-rav4-vs-honda-cr-v');
  });

  it('becomes a list of one’s own once a car is added', async () => {
    const extra = { ...trustDashboard.car, id: 'cx5-2026' };
    mockCompareStore([rav4, crv, extra]);
    renderAt('/compare/toyota-rav4-vs-honda-cr-v');
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(
        '/compare?cars=rav4-2026,crv-2026,cx5-2026',
      ),
    );
    expect(screen.queryByRole('heading', { name: 'Toyota RAV4 vs Honda CR-V' })).toBeNull();
  });
});
