import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as api from '../services/api';
import FilterSheet from './FilterSheet';
import { useCarStore } from '../stores/carStore';

vi.mock('../services/api', () => ({
  getStatistics: vi.fn(),
  getMakes: vi.fn(),
  searchCars: vi.fn(),
  getModelLines: vi.fn(),
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
    // Each section folds to its name and what is chosen; the common ones open.
    const section = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}:`) });
    for (const name of ['Type', 'Make', 'Model year', 'Fuel']) {
      expect(section(name)).toHaveAttribute('aria-expanded', 'true');
    }
    for (const name of [
      'Fuel use',
      'Drive',
      'Safety and records',
      'Seats and gearbox',
      'Power',
      'Estimated value',
    ]) {
      expect(section(name)).toHaveAttribute('aria-expanded', 'false');
    }
    expect(section('Type')).toHaveTextContent('Any');
    // The share of cars NHTSA has rated, so an empty result is not a surprise.
    fireEvent.click(section('Safety and records'));
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
    fireEvent.click(screen.getByRole('button', { name: /^Safety and records/ }));
    fireEvent.click(screen.getByRole('button', { name: '5 stars' }));
    expect(useCarStore.getState().searchQuery.filters).toEqual({ safety: { min: 5 } });
    expect(onApplied).toHaveBeenCalled();
  });

  it('filters on the records with a tick, and says what each rests on', () => {
    render(
      <FilterSheet
        open
        onClose={vi.fn()}
        onFiltersApplied={vi.fn()}
        resultLabel={null}
        updating={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Safety and records/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /No recalls in Canada/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Not on the most-stolen list/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Collision warning standard/ }));
    expect(useCarStore.getState().searchQuery.filters).toEqual({
      noRecalls: true,
      theftListed: false,
      safetyTech: { features: ['fcw'], standard: true },
    });
    expect(screen.getByText(/Newer cars have had less time to be recalled/)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /No recalls in Canada/ }));
    expect(useCarStore.getState().searchQuery.filters).not.toHaveProperty('noRecalls');
  });

  it('says drives in words', () => {
    render(
      <FilterSheet
        open
        onClose={vi.fn()}
        onFiltersApplied={vi.fn()}
        resultLabel={null}
        updating={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Drive/ }));
    fireEvent.click(screen.getByRole('button', { name: 'All-wheel' }));
    expect(useCarStore.getState().searchQuery.filters).toEqual({ driveType: ['AWD'] });
    // The section says what is chosen, and stays open.
    expect(screen.getByRole('button', { name: /^Drive/ })).toHaveTextContent('All-wheel');
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

  it('offers a make’s models once the make is picked, those on sale first', async () => {
    vi.mocked(api.getModelLines).mockResolvedValue([
      { label: 'Honda Civic', name: 'Civic', path: '/models/honda/civic', first: 1995, last: 2026 },
      { label: 'Honda CR-V', name: 'CR-V', path: '/models/honda/cr-v', first: 1997, last: 2027 },
      { label: 'Honda S2000', name: 'S2000', path: '/models/honda/s2000', first: 2000, last: 2009 },
    ]);
    useCarStore.setState({ searchQuery: { filters: { make: ['Honda'] } } });
    render(
      <FilterSheet
        open
        onClose={vi.fn()}
        onFiltersApplied={vi.fn()}
        resultLabel={null}
        updating={false}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Civic' }));
    expect(useCarStore.getState().searchQuery.filters).toEqual({
      make: ['Honda'],
      modelLine: ['Honda Civic'],
    });
    expect(screen.queryByRole('button', { name: 'S2000' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Older models (1)' }));
    expect(screen.getByRole('button', { name: 'S2000' })).toBeTruthy();
    // Taking the make away takes its model with it.
    fireEvent.click(screen.getByRole('button', { name: 'Honda' }));
    expect(useCarStore.getState().searchQuery.filters?.modelLine).toBeUndefined();
  });
});
