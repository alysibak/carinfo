import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import NotFound from './NotFound';

vi.mock('../services/api', () => ({ getSearchSuggestions: vi.fn(() => Promise.resolve([])) }));

function Probe() {
  const { pathname, search } = useLocation();
  return <p data-testid="at">{pathname + search}</p>;
}

describe('NotFound', () => {
  it('offers a search and plain ways on', () => {
    render(
      <MemoryRouter initialEntries={['/nope']}>
        <Routes>
          <Route path="/nope" element={<NotFound />} />
          <Route path="/home" element={<Probe />} />
          <Route path="/vin" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start from what you need' })).toHaveAttribute(
      'href',
      '/browse',
    );
    expect(screen.getByRole('link', { name: 'Look up a VIN' })).toHaveAttribute('href', '/vin');

    const box = screen.getByRole('combobox', { name: 'Search cars' });
    fireEvent.change(box, { target: { value: 'civic' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(screen.getByTestId('at')).toHaveTextContent('/home?q=civic&sort=relevance');
  });

  it('keeps itself out of search results only while it is showing', () => {
    // The host serves unknown paths with a 200, so crawlers need the tag.
    const robots = () => document.head.querySelector('meta[name="robots"]');
    const { unmount } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(robots()).toHaveAttribute('content', 'noindex');
    unmount();
    expect(robots()).toBeNull();
  });
});
