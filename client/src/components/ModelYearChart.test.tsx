import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ModelYearSummary } from '../types/car.types';
import ModelYearChart from './ModelYearChart';
import { gridStep, labelStep } from '../utils/chartScale';

const year = (y: number, complaints?: number, recalls?: number): ModelYearSummary => ({
  year: y,
  carId: `rav4-${y}`,
  configurations: 2,
  fuelTypes: ['gasoline'],
  bodyStyles: ['suv'],
  generation: y >= 2019 ? 'XA50 · 5th generation (2019–2025)' : 'XA40 · 4th generation (2013–2018)',
  complaints,
  recalls,
  complaintPart: complaints ? 'ELECTRICAL SYSTEM' : undefined,
});

// Newest first, as the overview lists them; 2016 is not on file.
const YEARS = [year(2019, 902, 6), year(2018, 348, 3), year(2017, 321), year(2015, 305, 3)];

function renderChart() {
  return render(
    <MemoryRouter>
      <ModelYearChart years={YEARS} name="Toyota RAV4" />
    </MemoryRouter>,
  );
}

describe('ModelYearChart', () => {
  it('puts one gridline at a round value under the tallest bar', () => {
    expect(gridStep(1004)).toBe(1000);
    expect(gridStep(233)).toBe(200);
    expect(gridStep(9)).toBe(5);
    expect(gridStep(1)).toBe(1);
    expect(gridStep(0)).toBe(0);
  });

  it('names fewer years the more there are', () => {
    expect(labelStep(4, 5)).toBe(1);
    expect(labelStep(8, 5)).toBe(2);
    expect(labelStep(31, 8)).toBe(5);
    expect(labelStep(31, 5)).toBe(10);
  });

  it('gives each year on file one button that says its counts', () => {
    renderChart();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(
      screen.getByRole('button', {
        name: '2019: 902 owner complaints to NHTSA, most about electrical system; 6 recalls in Canada',
      }),
    ).toBeInTheDocument();
    // A year without a recall count says so rather than showing none as zero.
    expect(
      screen.getByRole('button', { name: /^2017: .*; no recall count on file$/ }),
    ).toBeInTheDocument();
  });

  it('opens with the worst year named, and a tapped year in words with a link to it', () => {
    renderChart();
    expect(
      screen.getByText('Most complaints: 2019. Pick a year for its figures.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^2018:/ }));
    expect(screen.getByRole('button', { name: /^2018:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('· 4th generation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the 2018 Toyota RAV4 →' })).toHaveAttribute(
      'href',
      '/car/rav4-2018',
    );
  });

  it('steps through the years on file with the arrow keys, one tab stop for all', () => {
    renderChart();
    const tabbable = screen.getAllByRole('button').filter((b) => b.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    const from = screen.getByRole('button', { name: /^2017:/ });
    fireEvent.click(from);
    // 2016 is not on file: the next year on is 2018.
    fireEvent.keyDown(from, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /^2018:/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: /^2018:/ }), { key: 'Home' });
    expect(screen.getByRole('button', { name: /^2015:/ })).toHaveFocus();
  });
});
