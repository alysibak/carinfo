/**
 * English and French. The English text is the key: `t('Compare')` is the
 * French entry for "Compare" when French is on, and the English otherwise,
 * so a string with no entry yet still reads in English rather than as a code.
 *
 * Call `t` while rendering, never at module scope: a module's constants are
 * built before the French dictionary loads. A label kept in a module-level
 * list is marked with `msg('…')` and translated where it is shown,
 * `t(item.label)`. i18n/coverage.test.ts fails on any `t('…')` or `msg('…')`
 * literal without a French entry.
 */

export type Locale = 'en' | 'fr';

type Vars = Record<string, string | number>;

let active: Locale = 'en';
let french: Record<string, string> = {};

export function locale(): Locale {
  return active;
}

/** "fr-CA" or "en-CA", for Intl's number and date formats. */
export function intlLocale(): string {
  return active === 'fr' ? 'fr-CA' : 'en-CA';
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** The text in the active language, with `{name}` placeholders filled. */
export function t(text: string, vars?: Vars): string {
  return fill(active === 'fr' ? (french[text] ?? text) : text, vars);
}

/**
 * One form or the other by the active language's plural rules ("1 version",
 * "2 versions"; French counts 0 as one), with `{count}` filled.
 */
export function tp(count: number, one: string, other: string, vars?: Vars): string {
  const form = new Intl.PluralRules(intlLocale()).select(count) === 'one' ? one : other;
  return t(form, { count, ...vars });
}

/** Marks a module-level label for translation where it is shown. */
export function msg(text: string): string {
  return text;
}

/** Sets the language and its dictionary (i18n/store.ts loads the French one). */
export function applyLocale(next: Locale, dictionary: Record<string, string> = {}): void {
  active = next;
  french = next === 'fr' ? dictionary : {};
  if (typeof document !== 'undefined')
    document.documentElement.lang = next === 'fr' ? 'fr-CA' : 'en';
}
