import type { ReactNode } from 'react';
import { useLocaleStore } from './store';

/**
 * Draws the app afresh when the language changes, so every `t()` call runs
 * again in the new one. Switching is rare; a fresh draw is simpler and surer
 * than having each text subscribe.
 */
export default function LocaleRoot({ children }: { children: (locale: string) => ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  return <>{children(locale)}</>;
}
