import { useEffect, useId, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { recentEntry } from '../stores/recentStore';

/** Long enough to mean something: "cr" finds too much, "cr-" enough. */
const MIN_CHARS = 2;
const SHOWN = 6;

/**
 * A car found by name and added where it is needed, without leaving the
 * page: one result per model year, each its base version, the newest and
 * best matches first. A year in the text ("2019 civic") narrows it.
 */
export default function AddCarSearch({
  onAdd,
  addedIds = [],
  label = 'Add a car',
  autoFocus = false,
}: {
  onAdd: (car: CarSpecs) => void;
  /** Cars already added, which say so. */
  addedIds?: string[];
  label?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [results, setResults] = useState<CarSpecs[] | null>(null);
  const [failed, setFailed] = useState(false);
  const query = text.trim();

  useEffect(() => {
    if (query.length < MIN_CHARS) {
      setResults(null);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    // Typing settles before the search goes out.
    const timer = setTimeout(() => {
      api
        .searchCars(
          {
            query,
            filters: {},
            sort: { field: 'relevance', order: 'desc' },
            collapseByModel: false,
            limit: SHOWN,
            offset: 0,
          },
          { signal: controller.signal },
        )
        .then((found) => {
          setResults(found.results);
          setFailed(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div>
      <label htmlFor={`${id}-q`} className="field-label">
        {label}
      </label>
      <input
        id={`${id}-q`}
        type="search"
        autoComplete="off"
        // Opened on request, so the cursor goes where the person is about to type.
        autoFocus={autoFocus}
        placeholder="e.g. 2024 Honda CR-V"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-1.5 block w-full h-12 bg-black border border-zinc-700 focus:border-zinc-300 px-3 text-base text-white placeholder:text-zinc-500 focus:outline-hidden rounded-none transition-colors"
      />
      <p className="sr-only" role="status">
        {results ? `${results.length} ${results.length === 1 ? 'car' : 'cars'} found` : ''}
      </p>
      {failed && <p className="text-sm text-red-300 mt-2">Could not search just now. Try again.</p>}
      {results && results.length === 0 && (
        <p className="text-sm text-zinc-400 mt-2">
          Nothing on file by that name. Try the make and model, like “Toyota RAV4”.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="mt-2 border border-zinc-800 divide-y divide-zinc-900">
          {results.map((car) => {
            const entry = recentEntry(car);
            const added = addedIds.includes(car.id);
            return (
              <li key={car.id}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => onAdd(car)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 min-h-[52px] text-left hover:bg-zinc-950 focus-visible:bg-zinc-950 disabled:opacity-60 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{entry.title}</span>
                    {entry.detail && (
                      <span className="block text-xs text-zinc-500 truncate">{entry.detail}</span>
                    )}
                  </span>
                  <span className={`shrink-0 text-sm ${added ? 'text-zinc-500' : 'text-accent'}`}>
                    {added ? 'Added' : '+ Add'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
