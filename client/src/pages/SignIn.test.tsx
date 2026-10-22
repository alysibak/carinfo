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
  providers: [],
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

  it('offers other accounts and password reset only where the site has them', async () => {
    renderSignIn();
    await waitFor(() => expect(accountApi.getAccountStatus).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Continue with/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Email me a code/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Forgot/ })).toBeNull();
  });

  it('signs in with Google, Apple or Microsoft, marking the one used last', async () => {
    fakeAuthClient.getLastUsedLoginMethod.mockReturnValue('apple');
    vi.mocked(accountApi.getAccountStatus).mockResolvedValue({
      ...capabilities,
      providers: ['google', 'apple', 'microsoft'],
      emailConfigured: true,
    });
    renderSignIn();
    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue with Microsoft' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^Continue with Apple,\s?Last used$/ }));
    expect(fakeAuthClient.signIn.social).toHaveBeenCalledWith({
      provider: 'apple',
      callbackURL: '/vin',
      errorCallbackURL: '/sign-in?next=%2Fvin&via=apple',
    });
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toBeInTheDocument();
  });

  it('says what went wrong when a provider sends someone back', () => {
    renderSignIn('/sign-in?next=%2Fvin&via=microsoft&error=access_denied');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Microsoft sign-in did not finish. Try again, or use your email.',
    );
  });

  it('signs in with a code by email, no password needed', async () => {
    vi.mocked(accountApi.getAccountStatus).mockResolvedValue({
      ...capabilities,
      emailConfigured: true,
    });
    renderSignIn();
    fireEvent.click(await screen.findByRole('button', { name: 'No password? Email me a code' }));
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'sam@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email me a code' }));
    await waitFor(() =>
      expect(fakeAuthClient.emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
        email: 'sam@example.com',
        type: 'sign-in',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'We emailed a 6-digit code to sam@example.com.',
    );
    // Pasted with a space, the code still goes in, and is sent once complete.
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: '123 456' } });
    await waitFor(() =>
      expect(fakeAuthClient.signIn.emailOtp).toHaveBeenCalledWith({
        email: 'sam@example.com',
        otp: '123456',
        name: 'sam',
      }),
    );
  });

  it('opens on the code form for someone who used one last time', async () => {
    fakeAuthClient.getLastUsedLoginMethod.mockReturnValue('email-otp');
    vi.mocked(accountApi.getAccountStatus).mockResolvedValue({
      ...capabilities,
      emailConfigured: true,
    });
    renderSignIn();
    expect(await screen.findByRole('button', { name: 'Email me a code' })).toBeVisible();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });
});
