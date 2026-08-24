import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SiteHeader from './SiteHeader';

function renderHeader() {
  return render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>,
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
}

describe('SiteHeader mobile menu', () => {
  it('renders the panel outside <header>, which is a fixed-position containing block', () => {
    const { container } = renderHeader();
    openMenu();

    // The header carries backdrop-filter, so any fixed-position descendant is
    // sized against the header rather than the viewport and collapses to its
    // height. The panel must therefore be portaled out of it.
    const panel = document.querySelector('nav.page-wrap')?.parentElement;
    expect(panel).toBeTruthy();
    expect(container.querySelector('header')?.contains(panel!)).toBe(false);
    expect(panel!.parentElement).toBe(document.body);
  });

  it('covers the page opaquely rather than letting content show through', () => {
    renderHeader();
    openMenu();

    const panel = document.querySelector('nav.page-wrap')!.parentElement!;
    expect(panel.className).toContain('bg-black');
    expect(panel.className).not.toMatch(/bg-black\/\d/);
  });

  it('scrolls its own overflow so the links stay reachable on short viewports', () => {
    renderHeader();
    openMenu();

    const panel = document.querySelector('nav.page-wrap')!.parentElement!;
    expect(panel.className).toContain('overflow-y-auto');
  });

  it('closes on Escape, which otherwise leaves body scroll locked', () => {
    renderHeader();
    openMenu();
    expect(document.querySelector('nav.page-wrap')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('nav.page-wrap')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});
