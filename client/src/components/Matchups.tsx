import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { Matchup } from '../types/car.types';

/**
 * Rivals shoppers weigh against each other, a tap from side by side: the
 * same model year of each, on the version each model page opens.
 */
export default function Matchups({
  onPick,
  picking,
}: {
  onPick: (matchup: Matchup) => void;
  /** The match-up loading, which says so. */
  picking?: string | null;
}) {
  const [matchups, setMatchups] = useState<Matchup[] | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getMatchups()
      .then((list) => {
        if (active) setMatchups(list);
      })
      .catch(() => {
        if (active) setMatchups([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (matchups === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[76px] border border-zinc-900 bg-zinc-950 animate-pulse" />
        ))}
      </div>
    );
  }
  if (matchups.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {matchups.map((matchup) => (
        <li key={matchup.label}>
          <button
            type="button"
            disabled={!!picking}
            onClick={() => onPick(matchup)}
            className="choice-tile w-full text-left disabled:opacity-60"
          >
            <span className="min-w-0">
              <span className="block text-[15px] text-white">
                {matchup.label}
                <span className="text-zinc-500 tabular-nums"> · {matchup.year}</span>
              </span>
              <span className="block text-[13px] text-zinc-400 mt-0.5">
                {picking === matchup.label
                  ? 'Loading…'
                  : matchup.cars.map((car) => car.label).join(' · ')}
              </span>
            </span>
            <span aria-hidden className="text-zinc-500 shrink-0">
              →
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
