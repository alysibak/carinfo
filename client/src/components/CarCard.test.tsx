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
    const link = screen.getByRole('link', { name: new RegExp(car.model, 'i') });
    expect(link).toHaveAttribute('href', `/car/${car.id}`);
  });

  it('keeps the compare control always visible', () => {
    renderCard();
    const compare = screen.getByRole('button', { name: /compare/i });
    expect(compare.parentElement?.className).not.toContain('lg:opacity-0');
    expect(compare.parentElement?.className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
  });
});
