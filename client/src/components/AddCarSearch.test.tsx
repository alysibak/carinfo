import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddCarSearch from './AddCarSearch';
import * as api from '../services/api';
import { sparseDashboard } from '../test/fixtures';

vi.mock('../services/api', () => ({ searchCars: vi.fn() }));

const crv = {
  ...sparseDashboard.car,
  id: 'crv-2024',
  year: 2024,
  make: 'Honda',
  model: 'CR-V FWD',
  bodyStyle: 'suv' as const,
  driveType: 'FWD',
};

describe('AddCarSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('finds cars by name once typing settles, and adds the one tapped', async () => {
    vi.mocked(api.searchCars).mockResolvedValue({
      results: [crv],
      total: 1,
    } as Awaited<ReturnType<typeof api.searchCars>>);
    const onAdd = vi.fn();
    render(<AddCarSearch onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText('Add a car'), { target: { value: 'c' } });
    fireEvent.change(screen.getByLabelText('Add a car'), { target: { value: 'cr-v 2024' } });
    expect(api.searchCars).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(api.searchCars).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.searchCars).mock.calls[0][0]).toMatchObject({
      query: 'cr-v 2024',
      collapseByModel: false,
    });
    fireEvent.click(screen.getByRole('button', { name: /2024 Honda CR-V/ }));
    expect(onAdd).toHaveBeenCalledWith(crv);
  });

  it('says when a car is already in, and when nothing matches', async () => {
    vi.mocked(api.searchCars).mockResolvedValueOnce({
      results: [crv],
      total: 1,
    } as Awaited<ReturnType<typeof api.searchCars>>);
    const { rerender } = render(<AddCarSearch onAdd={vi.fn()} addedIds={['crv-2024']} />);
    fireEvent.change(screen.getByLabelText('Add a car'), { target: { value: 'cr-v' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByRole('button', { name: /Added/ })).toBeDisabled();
    vi.mocked(api.searchCars).mockResolvedValueOnce({
      results: [],
      total: 0,
    } as unknown as Awaited<ReturnType<typeof api.searchCars>>);
    rerender(<AddCarSearch onAdd={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Add a car'), { target: { value: 'hovercraft' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText(/Nothing on file by that name/)).toBeVisible();
  });
});
