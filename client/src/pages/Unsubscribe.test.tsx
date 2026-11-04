import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as accountApi from '../services/accountApi';
import type * as AccountApi from '../services/accountApi';
import { HttpError } from '../services/http';
import Unsubscribe from './Unsubscribe';

vi.mock('../services/accountApi', async (importOriginal) => ({
  ...(await importOriginal<typeof AccountApi>()),
  unsubscribeRecallAlerts: vi.fn(),
}));

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Unsubscribe />
    </MemoryRouter>,
  );

describe('Unsubscribe', () => {
  beforeEach(() => {
    vi.mocked(accountApi.unsubscribeRecallAlerts).mockReset();
  });

  it('asks first, then turns alerts off with the link’s token', async () => {
    vi.mocked(accountApi.unsubscribeRecallAlerts).mockResolvedValue({ recallAlerts: false });
    renderAt('/unsubscribe?token=abc.def');
    expect(accountApi.unsubscribeRecallAlerts).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Turn recall alerts off' }));
    expect(await screen.findByText('Recall alerts are off. No more will be sent.')).toBeVisible();
    expect(accountApi.unsubscribeRecallAlerts).toHaveBeenCalledWith('abc.def');
  });

  it('says so when the link is not valid', async () => {
    vi.mocked(accountApi.unsubscribeRecallAlerts).mockImplementation(async () => {
      throw new HttpError('bad', 400, { error: 'This unsubscribe link is not valid.' });
    });
    renderAt('/unsubscribe?token=forged');
    fireEvent.click(screen.getByRole('button', { name: 'Turn recall alerts off' }));
    expect(await screen.findByText(/This link is not valid/)).toBeVisible();
  });

  it('without a token, points to the account instead of offering a button', () => {
    renderAt('/unsubscribe');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('link', { name: 'account' })).toHaveAttribute('href', '/account');
  });
});
