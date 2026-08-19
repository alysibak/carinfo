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
    const link = screen.getByRole('link', { name: new RegExp(String(car.year)) });
    expect(link).toHaveAttribute('href', `/car/${car.id}`);
  });

  it('keeps the compare control reachable rather than hover-only', () => {
    renderCard();
    const compare = screen.getByRole('button', { name: /compare/i });
    // The reveal is scoped to lg: so touch and keyboard users always see it.
    expect(compare.parentElement?.className).toContain('lg:opacity-0');
    expect(compare.parentElement?.className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
  });
});
