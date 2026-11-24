import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { tripCostPerKm } from '@carinfo/shared/energy-cost';
import TripCost from './TripCost';
import { trustDashboard } from '../test/fixtures';
import { useRegionStore } from '../stores/regionStore';
import { costAssumptions } from '../utils/costAssumptions';
import { formatMoney } from '../utils/money';

const car = trustDashboard.car;
const perKm = () => tripCostPerKm(car, costAssumptions('ontario', null))!.perKmCad;

describe('TripCost', () => {
  beforeEach(() => useRegionStore.setState({ region: 'ontario', annualKm: null }));

  it('prices a drive people in the province make, then one of the visitor’s own', () => {
    render(<TripCost car={car} />);
    expect(screen.getByRole('button', { name: 'Toronto → Ottawa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByText(`About ${formatMoney(perKm() * 450)} in gas for 450 km.`),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Toronto → Montreal' }));
    expect(
      screen.getByText(`About ${formatMoney(perKm() * 540)} in gas for 540 km.`),
    ).toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: 'Your own distance, km' }), {
      target: { value: '1200' },
    });
    expect(
      screen.getByText(`About ${formatMoney(perKm() * 1200)} in gas for 1,200 km.`),
    ).toBeVisible();
  });

  it('says a plug-in hybrid’s trip is mostly on gas, and an EV’s is at home rates', () => {
    const phev = {
      ...car,
      engine: { ...car.engine, fuelType: 'plug-in hybrid' as const },
      epa: { ...car.epa, phev: { gasMpg: 40, electricMpge: 110 } },
    };
    const { unmount } = render(<TripCost car={phev} />);
    expect(screen.getByText(/the charge covers only the start/)).toBeVisible();
    unmount();
    const ev = {
      ...car,
      engine: { fuelType: 'electric' as const },
      fuelEconomy: { city: 130, highway: 110, combined: 120 },
    };
    render(<TripCost car={ev} />);
    expect(screen.getByText(/in electricity for 450 km, at home charging rates/)).toBeVisible();
  });
});
