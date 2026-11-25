import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import YearChooser from './YearChooser';
import type { ModelOverview, ModelYearSummary } from '../types/car.types';

const row = (year: number, generation: string, configurations = 3): ModelYearSummary => ({
  year,
  carId: `f150-${year}`,
  configurations,
  fuelTypes: ['gasoline'],
  bodyStyles: ['truck'],
  generation,
});

const overview = {
  make: 'Ford',
  name: 'F-150',
  path: '/models/ford/f-150',
  years: [
    row(2026, 'P702 · 14th generation (2021–2026)'),
    row(2025, 'P702 · 14th generation (2021–2026)'),
    row(2020, 'P552 · 13th generation (2015–2020)'),
    row(2019, 'P552 · 13th generation (2015–2020)', 1),
  ],
} as unknown as ModelOverview;

describe('YearChooser', () => {
  it('opens on the newest generation and reaches any year in two taps', () => {
    render(
      <MemoryRouter>
        <YearChooser overview={overview} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: '2025–2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('14th generation')).toBeVisible();
    expect(screen.getByRole('link', { name: /2026/ })).toHaveAttribute(
      'href',
      '/models/ford/f-150/2026',
    );

    fireEvent.click(screen.getByRole('button', { name: '2019–2020' }));
    expect(screen.getByText('13th generation')).toBeVisible();
    expect(screen.queryByRole('link', { name: /2026/ })).toBeNull();
    // A year with one version opens that car.
    expect(screen.getByRole('link', { name: /2019/ })).toHaveAttribute('href', '/car/f150-2019');
  });
});
