import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CarDashboard, CarSpecs } from '../types/car.types';
import ListingCheck from './ListingCheck';

const car = { year: 2018 } as CarSpecs;
const dashboard = {
  ownership: { unvalued: false, marketValue: { low: 15000, high: 19000 } },
} as unknown as CarDashboard;

describe('ListingCheck', () => {
  it('groups the digits as they are typed', () => {
    render(<ListingCheck car={car} dashboard={dashboard} />);
    const km = screen.getByRole('textbox', { name: 'Odometer' });
    fireEvent.change(km, { target: { value: '123456' } });
    expect(km).toHaveValue('123,456');
    // Typing on after the separator keeps one number, regrouped.
    fireEvent.change(km, { target: { value: '123,4567' } });
    expect(km).toHaveValue('1,234,567');
  });

  it('clears a field in a tap and hands the cursor back', () => {
    render(<ListingCheck car={car} dashboard={dashboard} />);
    const price = screen.getByRole('textbox', { name: 'Asking price' });
    fireEvent.change(price, { target: { value: '25000' } });
    expect(price).toHaveValue('25,000');
    expect(screen.getByText(/above our estimated value/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Asking price' }));
    expect(price).toHaveValue('');
    expect(price).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear Asking price' })).toBeNull();
  });
});
