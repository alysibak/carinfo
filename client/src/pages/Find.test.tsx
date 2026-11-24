import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Find from './Find';
import * as api from '../services/api';

vi.mock('../services/api', () => ({ searchCars: vi.fn() }));

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/find" element={<Find />} />
        <Route path="/home" element={<p>results</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

describe('Find', () => {
  beforeEach(() => {
    vi.mocked(api.searchCars).mockResolvedValue({ results: [], total: 412 } as never);
  });

  it('counts the models that fit and leads to them, one row per model', async () => {
    renderAt('/find?carry=more');
    expect(screen.getByRole('button', { name: /6 to 8 people/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText('412 models fit')).toBeVisible();
    expect(vi.mocked(api.searchCars).mock.calls.at(-1)![0]).toMatchObject({
      filters: { threeRow: true },
      collapseByModel: true,
      limit: 1,
    });
    const show = screen.getByRole('link', { name: 'Show them' });
    expect(show.getAttribute('href')).toMatch(/^\/home\?.*rows=3/);
    expect(show.getAttribute('href')).toContain('sort=runningCost');
  });

  it('keeps each answer in the address, and a second tap takes it back', async () => {
    renderAt('/find');
    fireEvent.click(screen.getByRole('button', { name: 'Electric' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/find?runs=electric');
    fireEvent.click(screen.getByRole('button', { name: 'Five crash-test stars' }));
    expect(screen.getByTestId('where')).toHaveTextContent('runs=electric&must=stars');
    fireEvent.click(screen.getByRole('button', { name: 'Electric' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/find?must=stars');
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/find$/);
  });

  it('says when nothing fits, instead of leading to an empty list', async () => {
    vi.mocked(api.searchCars).mockResolvedValue({ results: [], total: 0 } as never);
    renderAt('/find?carry=two&runs=plugin&new=older');
    await waitFor(() =>
      expect(screen.getByText('No model fits all of these. Take one away.')).toBeVisible(),
    );
    expect(screen.queryByRole('link', { name: 'Show them' })).toBeNull();
  });
});
