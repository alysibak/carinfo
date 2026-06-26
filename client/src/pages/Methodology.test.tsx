import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Methodology from './Methodology';

describe('Methodology page', () => {
  it('documents the trust pipeline and provenance labels', () => {
    render(
      <MemoryRouter>
        <Methodology />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /methodology/i })).toBeInTheDocument();
    expect(screen.getByText(/PHEV \/ BEV reclassification/i)).toBeInTheDocument();
    expect(screen.getByText(/Data pipeline/i)).toBeInTheDocument();
    expect(screen.getAllByText('EPA').length).toBeGreaterThan(0);
    expect(screen.getByText('Est.')).toBeInTheDocument();
  });
});
