import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SearchModelYears from './SearchModelYears';
import type { FoundModel, ModelYearChoice } from '../types/car.types';

const row = (year: number, generation: string): ModelYearChoice => ({
  year,
  carId: `f150-${year}`,
  configurations: 12,
  generation,
});

const f150 = {
  label: 'Ford F-150',
  path: '/models/ford/f-150',
  years: [
    row(2026, 'P702 · 14th generation (2021–2026)'),
    row(2025, 'P702 · 14th generation (2021–2026)'),
    row(2020, 'P552 · 13th generation (2015–2020)'),
  ],
};

const found = (label: string, path: string, from: number, to: number): FoundModel => ({
  label,
  path,
  from,
  to,
  years: to - from + 1,
  onFile: to - from + 1,
});

describe('SearchModelYears', () => {
  it('puts the searched model’s years above the rows, and the other models found a tap away', () => {
    render(
      <MemoryRouter>
        <SearchModelYears
          model={f150}
          found={[
            found('Ford F-150', '/models/ford/f-150', 1995, 2026),
            found('Ford F-150 Lightning', '/models/ford/f-150-lightning', 2022, 2025),
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Choose a year of the Ford F-150' })).toBeVisible();
    expect(screen.getByRole('link', { name: /^2025/ })).toHaveAttribute(
      'href',
      '/models/ford/f-150/2025',
    );
    expect(screen.getByRole('link', { name: /Ford F-150 Lightning/ })).toHaveAttribute(
      'href',
      '/models/ford/f-150-lightning',
    );
    // The model above is not offered again.
    expect(screen.queryByRole('link', { name: /^Ford F-150 1995/ })).toBeNull();
  });

  it('names no other model when the search found one', () => {
    render(
      <MemoryRouter>
        <SearchModelYears
          model={f150}
          found={[found('Ford F-150', '/models/ford/f-150', 1995, 2026)]}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Also found')).toBeNull();
  });
});
