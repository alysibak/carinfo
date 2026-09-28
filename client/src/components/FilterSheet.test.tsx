import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as api from '../services/api';
import FilterSheet from './FilterSheet';
import { useCarStore } from '../stores/carStore';

vi.mock('../services/api', () => ({
  getStatistics: vi.fn(),
  getMakes: vi.fn(),
  searchCars: vi.fn(),
}));

describe('FilterSheet', () => {
  beforeEach(() => {
    vi.mocked(api.getStatistics).mockResolvedValue({
      totalCars: 1000,
      totalModels: 100,
      totalMakes: 10,
      totalCountries: 2,
      countries: ['Japan', 'USA'],
      yearRange: { min: 1995, max: 2027 },
      bodyStyles: {},
      fuelTypes: {},
      lastUpdated: '',
      dataSources: [],
      provenanceCounts: { epa: 0, nhtsa: 0, estimated: 0, curated: 0 },
      coverage: { fuelEconomy: 1000, nhtsaSafety: 125, estimatedPrice: 900 },
    });
    vi.mocked(api.getMakes).mockResolvedValue(['Toyota', 'Honda']);
    vi.mocked(api.searchCars).mockResolvedValue({
      results: [],
      total: 0,
      hasMore: false,
    } as unknown as Awaited<ReturnType<typeof api.searchCars>>);
    useCarStore.setState({ searchQuery: { query: 'suv', filters: {} } });
  });

  it('offers every filter and says how many cars they leave', async () => {
    const onClose = vi.fn();
    render(
      <FilterSheet
        open
        onClose={onClose}
        onFiltersApplied={vi.fn()}
        resultLabel="309 models"
        updating={false}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeTruthy();
    for (const heading of [
      'Vehicle type',
      'Make',
      'Safety (NHTSA)',
      'Power',
      'Seats and gearbox',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    }
    // The share of cars NHTSA has rated, so an empty result is not a surprise.
    expect(await screen.findByText(/crash-tested 13% of the versions/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show 309 models' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies a filter the moment it is tapped', () => {
    const onApplied = vi.fn();
    render(
      <FilterSheet
        open
        onClose={vi.fn()}
        onFiltersApplied={onApplied}
        resultLabel={null}
        updating
      />,
    );
    expect(screen.getByRole('button', { name: 'Updating…' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '5 stars' }));
    expect(useCarStore.getState().searchQuery.filters).toEqual({ safety: { min: 5 } });
    expect(onApplied).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <FilterSheet
        open
        onClose={onClose}
        onFiltersApplied={vi.fn()}
        resultLabel={null}
        updating={false}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
