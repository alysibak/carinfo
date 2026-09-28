import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';
import SiteHeader from './SiteHeader';

// Production builds carry a Clerk key; the rest of the suite runs without one,
// which is how a header that threw on the landing page reached production.
vi.mock('../utils/authConfig', () => ({
  CLERK_PUBLISHABLE_KEY: 'pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk',
  isAuthConfigured: () => true,
}));

describe('SiteHeader with Clerk configured', () => {
  it('renders on the landing page, outside Clerk, without the error screen', async () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <SiteHeader transparentUntilScroll />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    // Let a lazily loaded Clerk component, had the header asked for one, load and render.
    await act(async () => {
      await import('./AccountAuth');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByText(/something went wrong/i)).toBeNull();
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
  });
});
