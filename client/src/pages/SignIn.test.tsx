import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetAccountStatusForTests } from '../hooks/useAccountStatus';
import * as accountApi from '../services/accountApi';
import type * as AccountApi from '../services/accountApi';
import { fakeAuth, fakeAuthClient } from '../test/fakeAuthClient';
import SignIn from './SignIn';

vi.mock('../services/accountApi', async (importOriginal) => ({
  ...(await importOriginal<typeof AccountApi>()),
  getAccountStatus: vi.fn(),
}));

const capabilities = {
  authConfigured: true,
  storageConfigured: true,
  billingConfigured: false,
  googleSignIn: false,
  emailConfigured: false,
  freeGarageLimit: 10,
};

function renderSignIn(path = '/sign-in?next=%2Fvin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/vin" element={<p>VIN decoder</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SignIn', () => {
  beforeEach(() => {
    __resetAccountStatusForTests();
    vi.mocked(accountApi.getAccountStatus).mockResolvedValue(capabilities);
    fakeAuth.signedOut();
  });

  it('signs in with the email and password typed', async () => {
    renderSignIn();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(fakeAuthClient.signIn.email).toHaveBeenCalledWith({
        email: 'sam@example.com',
        password: 'hunter2hunter2',
        rememberMe: true,
      }),
    );
  });

  it('says so when the password is wrong', async () => {
    fakeAuthClient.signIn.email.mockResolvedValueOnce({
      data: null,
      error: { status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' },
    } as never);
    renderSignIn();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('goes on to the page that asked for sign-in', () => {
    fakeAuth.signedIn();
    renderSignIn();
    expect(screen.getByText('VIN decoder')).toBeInTheDocument();
  });

  it('offers Google and password reset only where the site has them', async () => {
    renderSignIn();
    await waitFor(() => expect(accountApi.getAccountStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Google/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Forgot/ })).toBeNull();
  });

  it('starts Google sign-in, coming back to the same page', async () => {
    vi.mocked(accountApi.getAccountStatus).mockResolvedValue({
      ...capabilities,
      googleSignIn: true,
      emailConfigured: true,
    });
    renderSignIn();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    expect(fakeAuthClient.signIn.social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/vin',
      errorCallbackURL: '/sign-in?next=%2Fvin',
    });
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toBeInTheDocument();
  });
});
