import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { differentiateVsAnchor } from '../utils/differentiateCars';
import { efficiencyOf } from '../utils/efficiency';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';
import { displayModelLabel, displayVehicleTitle } from '../utils/trimLabel';
import { useCarStore } from '../stores/carStore';
import RatingStars from './RatingStars';

/** Nearby alternatives with plain-English trade-offs vs the car you're viewing. */
export default function SimilarCars({ car }: { car: CarSpecs }) {
  const [cars, setCars] = useState<CarSpecs[] | null>(null);
  const { addOrReplaceOldestInComparison, comparedCars } = useCarStore();

  useEffect(() => {
    let active = true;
    setCars(null);
    api
      .getSimilarCars(car.id, 6)
      .then((results) => {
        if (active) setCars(results);
      })
      .catch(() => {
        if (active) setCars([]);
      });
    return () => {
      active = false;
    };
  }, [car.id]);

  const edges = useMemo(
    () => (cars && cars.length > 0 ? differentiateVsAnchor(car, cars) : {}),
    [car, cars],
  );

  if (cars && cars.length === 0) return null;

  return (
    <section id="similar" className="border-t border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight">
        <h2 className="block-title mb-1">Alternatives</h2>
        <p className="text-xs text-zinc-500 mb-3">How each differs from this one.</p>

        {cars == null ? (
          <div className="space-y-0 border-t border-zinc-900">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 border-b border-zinc-900 opacity-40" />
            ))}
          </div>
        ) : (
          <ul className="border-t border-zinc-800">
            {cars.map((alt) => {
              const efficiency = efficiencyOf(alt);
              const inCompare = comparedCars.some((c) => c.id === alt.id);
              return (
                <li key={alt.id} className="border-b border-zinc-900">
                  {/* A row each: the name, how it differs, and a small compare toggle. */}
                  <div className="flex items-center gap-3 py-3">
                    <Link to={`/car/${alt.id}`} className="min-w-0 flex-1 group">
                      <p className="text-sm font-semibold text-white group-hover:text-zinc-300 tracking-tight">
                        {alt.year} {alt.make} {displayModelLabel(alt)}
                      </p>
                      {edges[alt.id] && (
                        <p className="text-[13px] text-zinc-300 mt-0.5 leading-snug">
                          {edges[alt.id]}
                        </p>
                      )}
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 mt-0.5">
                        <span>
                          {[
                            // The fuel figure once: the line above often gives it.
                            edges[alt.id]?.includes(efficiency?.unit ?? '\u0000')
                              ? null
                              : efficiency?.text,
                            alt.engine.horsepower ? `${alt.engine.horsepower} hp` : null,
                            bodyStyleLabel(alt.bodyStyle),
                            alt.driveType,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {(alt.safetyRating?.overall ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="sr-only">
                              NHTSA {alt.safetyRating!.overall} out of 5 stars
                            </span>
                            <RatingStars
                              stars={alt.safetyRating!.overall!}
                              className="w-2.5 h-2.5"
                            />
                          </span>
                        )}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => addOrReplaceOldestInComparison(alt)}
                      aria-pressed={inCompare}
                      aria-label={`${inCompare ? 'In compare' : 'Add to compare'}: ${alt.year} ${alt.make} ${displayModelLabel(alt)}`}
                      className={`chip shrink-0 min-h-[40px] ${inCompare ? 'chip-on' : ''}`}
                    >
                      {inCompare ? '✓ Compare' : '+ Compare'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {cars != null && cars.length > 0 && (
          // The search lists up to 24, as the page's six are drawn: "cars like …".
          <Link
            to={`/home?q=${encodeURIComponent(`cars like ${displayVehicleTitle(car)}`.toLowerCase())}`}
            className="inline-flex items-center min-h-[40px] mt-3 text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
          >
            More rivals of the {displayVehicleTitle(car)}
          </Link>
        )}
      </div>
    </section>
  );
}
