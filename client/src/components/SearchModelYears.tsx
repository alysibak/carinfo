import { Link } from 'react-router-dom';
import type { FoundModel, SearchResults } from '../types/car.types';
import YearChooser from './YearChooser';
import { t } from '../i18n';

const span = (model: FoundModel) =>
  model.from === model.to ? `${model.from}` : `${model.from}–${model.to}`;

/**
 * "civic" found thirty-three model years, a row each: the model's
 * generations and years above the rows, so the year wanted is two taps away
 * rather than a scroll down the list. "f-150" also found the F-150 Lightning
 * and two tuners' F150s, each a tap from its own page.
 */
export default function SearchModelYears({
  model,
  found = [],
}: {
  model: NonNullable<SearchResults['modelYears']>;
  /** Every model the search found, the one above among them. */
  found?: FoundModel[];
}) {
  const others = found.filter((other) => other.path !== model.path);
  return (
    <div className="mb-6 border border-zinc-800 p-4 sm:p-5">
      <YearChooser
        overview={model}
        heading={t('Choose a year of the {label}', { label: model.label })}
        className=""
      />
      {others.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-900">
          <p className="text-xs text-zinc-400 mb-1.5">{t('Also found')}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {others.map((other) => (
              <li key={other.path}>
                <Link
                  to={other.path}
                  className="group inline-flex items-baseline gap-1.5 min-h-[36px] py-1.5 text-sm text-zinc-300 hover:text-white"
                >
                  <span className="underline underline-offset-4 decoration-zinc-700 group-hover:decoration-zinc-400">
                    {other.label}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums">{span(other)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
