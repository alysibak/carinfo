import { useMemo } from 'react';
import type { CarSpecs } from '../types/car.types';
import { countWith, versionChoices, type Picks } from '../utils/versionChoice';
import { t, tp } from '../i18n';

/**
 * Pick a version by what tells them apart: a row of chips per choice that
 * varies this year, each with how many versions it leaves. A chip that
 * would leave none, with the other picks, is greyed out; a second tap
 * takes a pick back.
 */
export default function VersionChooser({
  cars,
  picks,
  onChange,
  shown,
}: {
  cars: CarSpecs[];
  picks: Picks;
  onChange: (next: Picks) => void;
  /** How many versions the picks leave, said under the chips. */
  shown: number;
}) {
  const choices = useMemo(() => versionChoices(cars), [cars]);
  if (!choices.length) return null;
  const picked = Object.values(picks).some(Boolean);
  const optionLabel = (id: string, value: string) =>
    id === 'doors' ? t('{count}-door', { count: value }) : t(value);

  return (
    <div className="space-y-3.5">
      {choices.map((choice) => (
        <div key={choice.id} role="group" aria-label={t(choice.label)}>
          <p className="text-xs text-zinc-400 mb-1.5">{t(choice.label)}</p>
          <div className="flex flex-wrap gap-2">
            {choice.options.map((value) => {
              const on = picks[choice.id] === value;
              const count = countWith(cars, picks, choice.id, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && count === 0}
                  onClick={() => onChange({ ...picks, [choice.id]: on ? undefined : value })}
                  className={`chip ${on ? 'chip-on' : ''} disabled:opacity-35 disabled:cursor-not-allowed`}
                >
                  {optionLabel(choice.id, value)}
                  <span className="ml-1.5 text-zinc-500 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300"
        aria-live="polite"
      >
        {picked
          ? tp(shown, '{count} version fits', '{count} versions fit')
          : tp(
              cars.length,
              '{count} version: pick what matters to you',
              '{count} versions: pick what matters to you',
            )}
        {picked && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="min-h-[36px] text-zinc-400 underline underline-offset-4 decoration-zinc-700 hover:text-white"
          >
            {t('Clear')}
          </button>
        )}
      </p>
    </div>
  );
}
