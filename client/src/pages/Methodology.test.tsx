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
    expect(
      screen.getByRole('heading', { name: 'Plug-in hybrids filed as electric' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /how a car’s page is put together/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What the labels mean' })).toBeInTheDocument();
    // Transport Canada measures the outside: the page no longer says no source has it.
    expect(screen.queryByText(/exterior dimensions/i)).toBeNull();
    expect(screen.getAllByText('EPA').length).toBeGreaterThan(0);
    expect(screen.getByText('Est.')).toBeInTheDocument();
  });
});
