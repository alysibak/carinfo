import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { COLLECTIONS } from '../config/collections';
import { displayModelLabel } from '../utils/trimLabel';
import { rankedFigure } from '../utils/rankedFigure';
import VehiclePlaceholder from './VehiclePlaceholder';

/**
 * The curated shortlists as cards that show what is in them: each list's
 * first three picks, each with the record the list ranks on. They were seven
 * full-width rows with a small "Picks →" at the far end, so nobody could tell
 * what a list held without opening it.
 */
export default function ShortlistCards() {
  const [previews, setPreviews] = useState<Record<string, CarSpecs[]> | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getCollectionPreviews()
      .then((data) => {
        if (active) setPreviews(data);
      })
      .catch(() => {
        if (active) setPreviews({});
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Object.values(COLLECTIONS).map((collection) => {
        const picks = previews?.[collection.id];
        return (
          <li key={collection.id}>
            <Link
              to={`/collection/${collection.id}`}
              className="group h-full surface-card-hover p-4 flex flex-col gap-3 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {collection.title}
                </h3>
                <p className="text-[13px] text-zinc-400 mt-0.5">{collection.subtitle}</p>
              </div>
              {previews == null ? (
                <div className="space-y-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-7 bg-zinc-900/70" />
                  ))}
                </div>
              ) : picks && picks.length > 0 ? (
                <ol className="space-y-1.5">
                  {picks.map((car) => {
                    const figure = rankedFigure(car, collection.display?.rankBy);
                    return (
                      <li key={car.id} className="flex items-center gap-2.5 min-w-0">
                        <span className="w-11 h-7 shrink-0 overflow-hidden" aria-hidden>
                          <VehiclePlaceholder car={car} compact hideCaption />
                        </span>
                        <span className="text-sm text-zinc-200 truncate min-w-0">
                          {car.year} {car.make} {displayModelLabel(car)}
                        </span>
                        {figure && (
                          <span className="ml-auto text-xs text-zinc-400 tabular-nums shrink-0">
                            {figure}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
              <span className="mt-auto text-[13px] text-zinc-300 group-hover:text-white transition-colors">
                See the shortlist →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
