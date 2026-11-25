import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ModelYearChoice } from '../types/car.types';
import { generationParts } from '../utils/modelYearFacts';
import { t, tp } from '../i18n';

const span = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);

/** Runs of years in one generation, newest first, as the page's tables group them. */
function generationsOf(years: ModelYearChoice[]) {
  const groups: Array<{ label?: string; rows: ModelYearChoice[] }> = [];
  for (const row of years) {
    const group = groups.at(-1);
    if (group && group.label === row.generation) group.rows.push(row);
    else groups.push({ label: row.generation, rows: [row] });
  }
  return groups;
}

/**
 * Any year of a model in two taps from the top of its page: its generation,
 * then the year, which opens that year's versions (or its one car). A model
 * with thirty years and six generations was a long scroll through tables.
 */
export default function YearChooser({
  overview,
  heading,
  className = 'mb-8',
}: {
  /** The model's page and its years, newest first: a model page's overview will do. */
  overview: { path: string; years: ModelYearChoice[] };
  /** "Choose a year" on the model's own page; search results name the model. */
  heading?: string;
  className?: string;
}) {
  const headingId = useId();
  const groups = generationsOf(overview.years);
  const named = groups.length > 1 && groups.some((group) => group.label);
  const [chosen, setChosen] = useState(0);
  const group = named ? groups[Math.min(chosen, groups.length - 1)] : null;
  const rows = group ? group.rows : overview.years;
  const parts = group?.label ? generationParts(group.label) : null;

  const yearLink = (row: ModelYearChoice) =>
    row.configurations >= 2
      ? `${overview.path}/${row.year}`
      : `/car/${encodeURIComponent(row.carId)}`;

  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="block-title mb-3">
        {heading ?? t('Choose a year')}
      </h2>
      {named && (
        <div className="mb-3" role="group" aria-label={t('Generation')}>
          <p className="text-xs text-zinc-400 mb-1.5">{t('Generation')}</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g, i) => {
              const last = g.rows[0].year;
              const first = g.rows[g.rows.length - 1].year;
              const on = i === chosen;
              return (
                <button
                  key={`${g.label ?? 'years'}-${last}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChosen(i)}
                  className={`chip tabular-nums ${on ? 'chip-on' : ''}`}
                >
                  {span(first, last)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {parts && (
        <p className="text-sm text-zinc-300 mb-2">
          {parts.name}
          {parts.code && <span className="ml-2 text-xs text-zinc-500">{parts.code}</span>}
        </p>
      )}
      <ul className="flex flex-wrap gap-2" aria-label={t('Years')}>
        {rows.map((row) => (
          <li key={row.year}>
            <Link
              to={yearLink(row)}
              className="chip inline-flex flex-col items-start min-w-[4.5rem] tabular-nums"
            >
              <span className="text-[15px] text-white">{row.year}</span>
              <span className="text-[11px] text-zinc-500">
                {tp(row.configurations, '{count} version', '{count} versions')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
