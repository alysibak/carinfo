import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CarCard from './CarCard';
import { sparseDashboard } from '../test/fixtures';

const car = sparseDashboard.car;

function renderCard() {
  return render(
    <MemoryRouter>
      <CarCard car={car} />
    </MemoryRouter>,
  );
}

describe('CarCard', () => {
  it('exposes the vehicle as a real link, not a click handler', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /2020 Toyota Corolla/i });
    expect(link).toHaveAttribute('href', `/car/${car.id}`);
  });

  it('keeps the compare control always visible', () => {
    renderCard();
    const compare = screen.getByRole('button', { name: /compare/i });
    expect(compare.parentElement?.className).not.toContain('lg:opacity-0');
    expect(compare.parentElement?.className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
  });

  it('does not repeat "electric" after an EV\'s engine label', () => {
    const ev = {
      ...car,
      engine: { fuelType: 'electric' as const },
      driveType: 'AWD' as const,
    };
    render(
      <MemoryRouter>
        <CarCard car={ev} />
      </MemoryRouter>,
    );
    const meta = screen.getByText(/AWD/);
    expect(meta.textContent?.toLowerCase().match(/electric/g) ?? []).toHaveLength(1);
  });
});
