import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../services/api';
import type { SearchSuggestion } from '../services/api';
import SearchBar from './SearchBar';

vi.mock('../services/api', () => ({ getSearchSuggestions: vi.fn() }));
const getSuggestions = vi.mocked(api.getSearchSuggestions);

interface Pending {
  query: string;
  signal?: AbortSignal;
  resolve: (s: SearchSuggestion[]) => void;
}

let pending: Pending[] = [];

beforeEach(() => {
  pending = [];
  getSuggestions.mockReset();
  getSuggestions.mockImplementation(
    (query = '', _limit, options) =>
      new Promise((resolve) => pending.push({ query, signal: options?.signal, resolve })),
  );
});

const suggestion = (label: string): SearchSuggestion => ({
  id: label,
  label,
  query: label.toLowerCase(),
});

function Harness({ onSubmit = () => {} }: { onSubmit?: (v: string) => void }) {
  const [value, setValue] = useState('');
  return <SearchBar value={value} onChange={setValue} onSubmit={onSubmit} />;
}

async function requestFor(query: string): Promise<Pending> {
  await waitFor(() => expect(pending.map((p) => p.query)).toContain(query));
  return pending.find((p) => p.query === query)!;
}

describe('SearchBar suggestions', () => {
  it('asks once per focus', async () => {
    render(<Harness />);
    fireEvent.focus(screen.getByRole('combobox', { name: 'Search vehicles' }));
    await requestFor('');
    // Let any duplicate request surface before counting.
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(getSuggestions).toHaveBeenCalledTimes(1);
  });

  it('never lets a slow answer for an earlier keystroke replace the current one', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Search vehicles' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ca' } });
    const ca = await requestFor('ca');
    fireEvent.change(input, { target: { value: 'camry' } });
    const camry = await requestFor('camry');

    expect(ca.signal?.aborted).toBe(true);
    act(() => camry.resolve([suggestion('Toyota Camry')]));
    act(() => ca.resolve([suggestion('Cadillac')]));

    expect(await screen.findByRole('option', { name: /toyota camry/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /cadillac/i })).not.toBeInTheDocument();
  });

  it('picks a suggestion from the keyboard', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByRole('combobox', { name: 'Search vehicles' });
    fireEvent.focus(input);
    const initial = await requestFor('');
    act(() => initial.resolve([suggestion('Honda Civic'), suggestion('Honda Accord')]));
    await screen.findByRole('option', { name: /honda accord/i });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('honda accord');
  });
});
