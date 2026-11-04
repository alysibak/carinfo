import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Privacy from './Privacy';
import Terms from './Terms';
import { legalDate } from '../utils/legal';

function renderPage(page: JSX.Element) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('Privacy policy', () => {
  it('names every service that handles personal information', () => {
    renderPage(<Privacy />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    for (const service of [/Stripe/, /Resend/, /vPIC/, /Wikimedia Commons/, /Vercel Web/]) {
      expect(screen.getAllByText(service).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/outside Quebec and outside Canada/)).toBeInTheDocument();
  });

  it('points to the Account page and both regulators', () => {
    renderPage(<Privacy />);
    expect(screen.getByRole('link', { name: 'Account page' })).toHaveAttribute('href', '/account');
    expect(
      screen.getByRole('link', { name: 'Office of the Privacy Commissioner of Canada' }),
    ).toHaveAttribute('href', 'https://www.priv.gc.ca/en/report-a-concern/');
    expect(
      screen.getByRole('link', { name: 'Commission d’accès à l’information' }),
    ).toBeInTheDocument();
    // Without VITE_CONTACT_EMAIL there is no address to show, and no broken mailto.
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});

describe('Terms of use', () => {
  it('says estimates are not quotes and links the other policies', () => {
    renderPage(<Terms />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument();
    expect(screen.getByText(/not quotes or offers/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacy policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'methodology' })).toHaveAttribute(
      'href',
      '/methodology',
    );
  });
});

describe('legalDate', () => {
  it('keeps the day whatever the timezone', () => {
    expect(legalDate('2026-11-04')).toBe('November 4, 2026');
    expect(legalDate('2026-11-04', 'fr-CA')).toBe('4 novembre 2026');
  });
});
