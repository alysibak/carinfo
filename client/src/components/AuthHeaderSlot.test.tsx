import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClerkMountedContext } from '../utils/clerkMounted';
import AuthHeaderSlot from './AuthHeaderSlot';
import SignInPromptSlot from './SignInPromptSlot';

vi.mock('../utils/authConfig', () => ({
  CLERK_PUBLISHABLE_KEY: 'pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk',
  isAuthConfigured: () => true,
}));

// Stand-ins for the components that call Clerk's hooks.
vi.mock('./AccountAuth', () => ({
  AuthHeaderControls: () => <span>Clerk controls</span>,
  SignInPromptBanner: () => <span>Sign-in banner</span>,
}));

function renderWithClerk(ui: ReactNode, clerkMounted: boolean) {
  return render(
    <MemoryRouter>
      <ClerkMountedContext.Provider value={clerkMounted}>{ui}</ClerkMountedContext.Provider>
    </MemoryRouter>,
  );
}

describe('AuthHeaderSlot', () => {
  it('links to the account page outside Clerk, as on the landing page', () => {
    renderWithClerk(<AuthHeaderSlot />, false);

    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
    expect(screen.queryByText('Clerk controls')).toBeNull();
  });

  it('closes the mobile menu when that link is followed', () => {
    const onNavigate = vi.fn();
    renderWithClerk(<AuthHeaderSlot onNavigate={onNavigate} />, false);

    fireEvent.click(screen.getByRole('link', { name: 'Account' }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("shows Clerk's own controls inside Clerk", async () => {
    renderWithClerk(<AuthHeaderSlot />, true);

    expect(await screen.findByText('Clerk controls')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Account' })).toBeNull();
  });
});

describe('SignInPromptSlot', () => {
  it('renders nothing outside Clerk', () => {
    const { container } = renderWithClerk(<SignInPromptSlot />, false);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the sign-in banner inside Clerk', async () => {
    renderWithClerk(<SignInPromptSlot />, true);
    expect(await screen.findByText('Sign-in banner')).toBeInTheDocument();
  });
});
