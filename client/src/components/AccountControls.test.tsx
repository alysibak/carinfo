import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { fakeAuth, fakeAuthClient } from '../test/fakeAuthClient';
import AuthHeaderSlot from './AuthHeaderSlot';
import ErrorBoundary from './ErrorBoundary';
import SiteHeader from './SiteHeader';

function renderAt(path: string, ui = <AuthHeaderSlot />) {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe('header account controls', () => {
  it('shows nothing where accounts are not set up', async () => {
    fakeAuth.unavailable();
    renderAt('/home');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('offers sign-in and sign-up that come back to the page', async () => {
    fakeAuth.signedOut();
    renderAt('/compare?ids=a,b');
    const next = `?next=${encodeURIComponent('/compare?ids=a,b')}`;
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/sign-in${next}`,
    );
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      `/sign-up${next}`,
    );
  });

  it('does not stack a next= on the sign-in pages themselves', async () => {
    fakeAuth.signedOut();
    renderAt('/sign-up?next=%2Fvin');
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });

  it('shows the account and signs out', async () => {
    fakeAuth.signedIn({ name: 'Sam' });
    const onNavigate = vi.fn();
    renderAt('/home', <AuthHeaderSlot onNavigate={onNavigate} />);
    expect(await screen.findByRole('link', { name: 'Sam' })).toHaveAttribute('href', '/account');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(fakeAuthClient.signOut).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('renders in the landing page header without the error screen', async () => {
    fakeAuth.signedOut();
    renderAt(
      '/',
      <ErrorBoundary>
        <SiteHeader transparentUntilScroll />
      </ErrorBoundary>,
    );
    expect((await screen.findAllByRole('link', { name: 'Sign in' })).length).toBeGreaterThan(0);
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });
});
