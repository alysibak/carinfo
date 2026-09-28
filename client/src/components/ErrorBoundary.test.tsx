import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import ErrorBoundary from './ErrorBoundary';

function Boom(): ReactElement {
  throw new Error('test crash');
}

describe('ErrorBoundary', () => {
  it('shows a recovery path instead of a blank screen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/home');

    spy.mockRestore();
  });

  it('keeps the rest of the page when a part with a fallback fails', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <h1>Home</h1>
          <ErrorBoundary fallback={null}>
            <Boom />
          </ErrorBoundary>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();

    spy.mockRestore();
  });
});
