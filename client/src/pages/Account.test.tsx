import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetAccountStatusForTests } from '../hooks/useAccountStatus';
import * as accountApi from '../services/accountApi';
import type * as AccountApi from '../services/accountApi';
import { fakeAuth, fakeAuthClient } from '../test/fakeAuthClient';
import Account from './Account';

vi.mock('../services/accountApi', async (importOriginal) => ({
  ...(await importOriginal<typeof AccountApi>()),
  getAccountStatus: vi.fn(),
  getMe: vi.fn(),
  setRecallAlerts: vi.fn(),
}));

function renderAccount() {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/account" element={<Account />} />
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/sign-in" element={<p>Sign-in page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Account: delete', () => {
  beforeEach(() => {
    __resetAccountStatusForTests();
    vi.mocked(accountApi.getAccountStatus).mockResolvedValue({
      authConfigured: true,
      storageConfigured: false,
      billingConfigured: false,
      providers: ['google'],
      emailConfigured: true,
      freeGarageLimit: 10,
    });
    fakeAuth.signedIn();
  });

  it('asks for the password, then deletes and goes home', async () => {
    renderAccount();
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account…' }));
    fireEvent.change(await screen.findByLabelText('Your password, to confirm'), {
      target: { value: 'hunter2hunter2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    await waitFor(() =>
      expect(fakeAuthClient.deleteUser).toHaveBeenCalledWith({ password: 'hunter2hunter2' }),
    );
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('without a password, sends someone whose sign-in is old to sign in again', async () => {
    fakeAuthClient.listAccounts.mockResolvedValueOnce({
      data: [{ providerId: 'google' }],
      error: null,
    });
    fakeAuthClient.deleteUser.mockResolvedValueOnce({
      data: null,
      error: { status: 400, code: 'SESSION_EXPIRED' },
    } as never);
    renderAccount();
    expect(
      await screen.findByText('This account has no password: you sign in with Google.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    await waitFor(() => expect(fakeAuthClient.deleteUser).toHaveBeenCalledWith({}));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in again' }));
    await waitFor(() => expect(fakeAuthClient.signOut).toHaveBeenCalled());
    expect(await screen.findByText('Sign-in page')).toBeInTheDocument();
  });
});

describe('Account: recall alerts and data', () => {
  beforeEach(() => {
    __resetAccountStatusForTests();
    vi.mocked(accountApi.getAccountStatus).mockResolvedValue({
      authConfigured: true,
      storageConfigured: true,
      billingConfigured: false,
      providers: [],
      emailConfigured: true,
      freeGarageLimit: 10,
    });
    vi.mocked(accountApi.getMe).mockResolvedValue({
      user: {
        id: 'u1',
        email: 'sam@example.com',
        plan: 'free',
        stripeCustomerId: null,
        recallAlerts: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      garageIds: [],
      freeGarageLimit: 10,
      garageLimit: 10,
    });
    vi.mocked(accountApi.setRecallAlerts).mockResolvedValue({ recallAlerts: true });
    fakeAuth.signedIn();
  });

  it('turns recall alerts on from the account page', async () => {
    renderAccount();
    const box = await screen.findByRole('checkbox', { name: 'Email me about new recalls' });
    await waitFor(() => expect(box).toBeEnabled());
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    await waitFor(() => expect(box).toBeChecked());
    expect(accountApi.setRecallAlerts).toHaveBeenCalledWith(true);
  });

  it('offers the account’s data as a download', async () => {
    renderAccount();
    const link = await screen.findByRole('link', { name: 'Download my data' });
    expect(link).toHaveAttribute('href', '/api/me/export');
    expect(link).toHaveAttribute('download');
  });
});
