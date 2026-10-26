import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SITE_SEARCH_ATTR, useSlashToSearch } from './useSlashToSearch';

vi.mock('../services/api', () => ({ getSearchSuggestions: vi.fn().mockResolvedValue([]) }));

function Shortcut() {
  useSlashToSearch();
  return null;
}

function Probe() {
  const location = useLocation();
  return <p>at {location.pathname}</p>;
}

describe('useSlashToSearch', () => {
  it('puts "/" into the page’s search box', () => {
    render(
      <MemoryRouter>
        <Shortcut />
        <input aria-label="Search cars" {...{ [SITE_SEARCH_ATTR]: '' }} />
        <input aria-label="Other field" />
      </MemoryRouter>,
    );
    fireEvent.keyDown(document.body, { key: '/' });
    expect(screen.getByLabelText('Search cars')).toHaveFocus();
  });

  it('leaves a "/" typed in a field alone', () => {
    render(
      <MemoryRouter>
        <Shortcut />
        <input aria-label="Search cars" {...{ [SITE_SEARCH_ATTR]: '' }} />
        <input aria-label="Other field" />
      </MemoryRouter>,
    );
    const other = screen.getByLabelText('Other field');
    other.focus();
    fireEvent.keyDown(other, { key: '/' });
    expect(other).toHaveFocus();
  });

  it('goes to the search page from a page without a search box', () => {
    render(
      <MemoryRouter initialEntries={['/methodology']}>
        <Shortcut />
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.keyDown(document.body, { key: '/' });
    expect(screen.getByText('at /home')).toBeInTheDocument();
  });
});
