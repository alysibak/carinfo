import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import OnThisPage from './OnThisPage';
import PinnedCarBar from './PinnedCarBar';

const sections = [
  { id: 'safety', label: 'Crash tests' },
  { id: 'recalls', label: 'Recalls and complaints' },
  { id: 'costs', label: 'Running costs' },
];

describe('section links', () => {
  it('list the page’s sections under its figures', () => {
    render(<OnThisPage sections={sections} />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(nav.querySelectorAll('a')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Running costs' })).toHaveAttribute('href', '#costs');
  });

  it('say nothing for a page with fewer than three', () => {
    const { container } = render(<OnThisPage sections={sections.slice(0, 2)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ride along in the pinned bar, the section being read marked', () => {
    // The sections as the page renders them; jsdom puts every one at the top.
    for (const { id } of sections) {
      const el = document.createElement('section');
      el.id = id;
      document.body.appendChild(el);
    }
    render(
      <MemoryRouter>
        <PinnedCarBar title="2026 Toyota RAV4" figures={null} sections={sections} />
      </MemoryRouter>,
    );
    const navs = screen.getAllByRole('navigation', { name: 'On this page', hidden: true });
    expect(navs.length).toBeGreaterThanOrEqual(1);
    const marked = navs[0].querySelector('[aria-current="location"]');
    expect(marked).toHaveTextContent('Running costs');
  });
});
