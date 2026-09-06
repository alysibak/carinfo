import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFound from './NotFound';

describe('NotFound', () => {
  it('offers exploration shortcuts and a home link', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /doesn't exist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse archive/i })).toHaveAttribute('href', '/browse');
    expect(screen.getByRole('link', { name: /value chart/i })).toHaveAttribute('href', '/value-matrix');
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });
});
