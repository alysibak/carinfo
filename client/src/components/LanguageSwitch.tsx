import { useLocaleStore } from '../i18n/store';

/**
 * EN / FR. Names the other language in that language, the way a bilingual
 * Canadian site does ("Français" on the English page).
 */
export default function LanguageSwitch({ className = '' }: { className?: string }) {
  const current = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const next = current === 'fr' ? 'en' : 'fr';
  return (
    <button
      type="button"
      lang={next === 'fr' ? 'fr' : 'en'}
      onClick={() => void setLocale(next)}
      className={`inline-flex items-center min-h-[44px] px-2 text-sm text-zinc-400 hover:text-white transition-colors ${className}`}
    >
      <span aria-hidden="true" className="sm:hidden">
        {next.toUpperCase()}
      </span>
      <span className="hidden sm:inline">{next === 'fr' ? 'Français' : 'English'}</span>
      <span className="sr-only sm:hidden">{next === 'fr' ? 'Français' : 'English'}</span>
    </button>
  );
}
