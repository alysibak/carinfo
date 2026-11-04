import { create } from 'zustand';
import { applyLocale, type Locale } from './index';

export const LOCALE_STORAGE_KEY = 'carinfo-lang';

/**
 * The language to open in: `?lang=fr` or `?lang=en` (a shared link), then the
 * visitor's earlier choice, then the browser's own language.
 */
export function detectLocale(
  host: { location: Pick<Location, 'search'>; navigator: Pick<Navigator, 'language'> } = window,
): Locale {
  const asked = new URLSearchParams(host.location.search).get('lang');
  if (asked === 'fr' || asked === 'en') {
    remember(asked);
    return asked;
  }
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    // Storage blocked: fall through to the browser's language.
  }
  return host.navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function remember(next: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // The choice holds for this visit only.
  }
}

/** The French dictionary loads only for those who read French: its own chunk. */
async function dictionaryFor(next: Locale): Promise<Record<string, string>> {
  return next === 'fr' ? (await import('./fr')).default : {};
}

interface LocaleStore {
  locale: Locale;
  /** Loads the language's dictionary, then switches; the app remounts in it (main.tsx). */
  setLocale: (next: Locale, options?: { remember?: boolean }) => Promise<void>;
}

export const useLocaleStore = create<LocaleStore>()((set) => ({
  locale: 'en',
  setLocale: async (next, { remember: keep = true } = {}) => {
    applyLocale(next, await dictionaryFor(next));
    if (keep) remember(next);
    set({ locale: next });
  },
}));
