import { useDisplayStore } from '../stores/displayStore';
import { t } from '../i18n';

const option = (on: boolean) =>
  `min-h-[36px] px-2 border transition-colors ${
    on ? 'border-zinc-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
  }`;

/** Theme and text size, saved on this device. */
export default function DisplaySettings({ className = '' }: { className?: string }) {
  const theme = useDisplayStore((s) => s.theme);
  const textSize = useDisplayStore((s) => s.textSize);
  const setTheme = useDisplayStore((s) => s.setTheme);
  const setTextSize = useDisplayStore((s) => s.setTextSize);
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs ${className}`}>
      <div role="group" aria-label={t('Theme')} className="flex items-center gap-1">
        <span className="text-zinc-500 mr-1" aria-hidden>
          {t('Theme')}
        </span>
        <button
          type="button"
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme('dark')}
          className={option(theme === 'dark')}
        >
          {t('Dark')}
        </button>
        <button
          type="button"
          aria-pressed={theme === 'light'}
          onClick={() => setTheme('light')}
          className={option(theme === 'light')}
        >
          {t('Light')}
        </button>
        <button
          type="button"
          aria-pressed={theme === 'system'}
          onClick={() => setTheme('system')}
          className={option(theme === 'system')}
        >
          {t('Match device')}
        </button>
      </div>
      <div role="group" aria-label={t('Text size')} className="flex items-center gap-1">
        <span className="text-zinc-500 mr-1" aria-hidden>
          {t('Text size')}
        </span>
        <button
          type="button"
          aria-pressed={textSize === 'standard'}
          onClick={() => setTextSize('standard')}
          className={option(textSize === 'standard')}
        >
          {t('Standard')}
        </button>
        <button
          type="button"
          aria-pressed={textSize === 'large'}
          onClick={() => setTextSize('large')}
          className={option(textSize === 'large')}
        >
          {t('Larger')}
        </button>
      </div>
    </div>
  );
}
