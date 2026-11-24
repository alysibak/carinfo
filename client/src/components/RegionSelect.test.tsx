import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import RegionSelect from './RegionSelect';
import { useRegionStore } from '../stores/regionStore';
import { costAssumptions } from '../utils/costAssumptions';

describe('RegionSelect', () => {
  beforeEach(() => useRegionStore.setState({ region: 'ontario', annualKm: null }));

  it('starts on the region’s average distance', () => {
    render(<RegionSelect />);
    expect(screen.getByRole('textbox', { name: 'driving' })).toHaveValue('15,000');
    expect(screen.getByText('(Ontario average)')).toBeInTheDocument();
  });

  it('keeps the visitor’s own distance, and hands it back to the average', () => {
    render(<RegionSelect />);
    const km = screen.getByRole('textbox', { name: 'driving' });
    fireEvent.change(km, { target: { value: '25000' } });
    expect(km).toHaveValue('25,000');
    fireEvent.blur(km);
    expect(useRegionStore.getState().annualKm).toBe(25000);

    fireEvent.click(screen.getByRole('button', { name: 'Use the Ontario average' }));
    expect(useRegionStore.getState().annualKm).toBeNull();
    expect(km).toHaveValue('15,000');
  });

  it('ignores a distance nobody drives, and follows the region when on its average', () => {
    render(<RegionSelect />);
    const km = screen.getByRole('textbox', { name: 'driving' });
    fireEvent.change(km, { target: { value: '50' } });
    fireEvent.blur(km);
    expect(useRegionStore.getState().annualKm).toBeNull();
    expect(km).toHaveValue('15,000');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'prince-edward-island' } });
    expect(km).toHaveValue('13,000');
  });
});

describe('costAssumptions', () => {
  it('is the region’s, on the visitor’s own distance when they set one', () => {
    expect(costAssumptions('ontario', null).annualKm).toBe(15000);
    const own = costAssumptions('ontario', 25000);
    expect(own.annualKm).toBe(25000);
    expect(own.gasPriceCadPerL).toBe(costAssumptions('ontario', null).gasPriceCadPerL);
    expect(costAssumptions('ontario', 5).annualKm).toBe(15000);
  });
});
