import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { applyLocale, msg, t, tp } from './index';
import { fmtDate, fmtMoney, fmtNumber } from './format';
import { rich } from './rich';
import { LOCALE_STORAGE_KEY, detectLocale, useLocaleStore } from './store';

const host = (search: string, language: string) => ({
  location: { search },
  navigator: { language },
});

afterEach(() => {
  applyLocale('en');
  localStorage.clear();
});

describe('t and tp', () => {
  it('reads English as written, French from the dictionary, and fills placeholders', () => {
    expect(t('{count} saved', { count: 3 })).toBe('3 saved');
    applyLocale('fr', { '{count} saved': '{count} enregistrés', Compare: 'Comparer' });
    expect(t('Compare')).toBe('Comparer');
    expect(t('{count} saved', { count: 3 })).toBe('3 enregistrés');
    expect(t('Not translated yet')).toBe('Not translated yet');
    expect(msg('Label')).toBe('Label');
  });

  it('follows each language’s plural rules: French counts 0 as one', () => {
    expect(tp(0, '{count} version', '{count} versions')).toBe('0 versions');
    expect(tp(1, '{count} version', '{count} versions')).toBe('1 version');
    applyLocale('fr', {});
    expect(tp(0, '{count} version', '{count} versions')).toBe('0 version');
    expect(tp(2, '{count} version', '{count} versions')).toBe('2 versions');
  });

  it('sets the page’s language', () => {
    applyLocale('fr', {});
    expect(document.documentElement.lang).toBe('fr-CA');
    applyLocale('en');
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('formats', () => {
  it('writes numbers, dollars and dates as each language does', () => {
    expect(fmtNumber(1234.5)).toBe('1,234.5');
    expect(fmtMoney(21950)).toBe('$21,950');
    expect(fmtDate('2026-11-04')).toBe('November 4, 2026');
    applyLocale('fr', {});
    expect(fmtNumber(1234.5).replace(/\s/g, ' ')).toBe('1 234,5');
    expect(fmtMoney(21950).replace(/\s/g, ' ')).toBe('21 950 $');
    expect(fmtDate('2026-11-04')).toBe('4 novembre 2026');
  });
});

describe('rich', () => {
  it('draws numbered tags with their renderers, wherever the language puts them', () => {
    render(
      <p data-testid="p">
        {rich('Read the <0>policy</0> and the <1>terms</1>.', [
          (c) => <a href="/privacy">{c}</a>,
          (c) => <strong>{c}</strong>,
        ])}
      </p>,
    );
    expect(screen.getByTestId('p')).toHaveTextContent('Read the policy and the terms.');
    expect(screen.getByRole('link', { name: 'policy' })).toHaveAttribute('href', '/privacy');
    expect(rich('No tags', [])).toBe('No tags');
  });
});

describe('detectLocale', () => {
  it('takes the link’s choice first, then the saved one, then the browser’s', () => {
    expect(detectLocale(host('', 'fr-CA'))).toBe('fr');
    expect(detectLocale(host('', 'en-US'))).toBe('en');
    expect(detectLocale(host('?lang=fr', 'en-US'))).toBe('fr');
    // The link's choice is kept for later visits.
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('fr');
    expect(detectLocale(host('', 'en-US'))).toBe('fr');
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    expect(detectLocale(host('', 'fr-CA'))).toBe('en');
  });
});

describe('setLocale', () => {
  it('loads the French dictionary, switches, and remembers the choice', async () => {
    await useLocaleStore.getState().setLocale('fr');
    expect(useLocaleStore.getState().locale).toBe('fr');
    expect(t('Compare')).toBe('Comparer');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('fr');
    await useLocaleStore.getState().setLocale('en');
    expect(t('Compare')).toBe('Compare');
  });
});
