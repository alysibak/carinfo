import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { differentiateVsAnchor } from '../utils/differentiateCars';
import { formatMpgForCard, formatPriceShort } from '../utils/dataValue';
import { usesMpge } from '../utils/fuelDisplay';
import { displayModelLabel } from '../utils/trimLabel';
import { useCarStore } from '../stores/carStore';

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
    <section id="similar" className="border-t border-zinc-900 scroll-mt-24">
      <div className="page-wrap-wide py-6 md:py-8">
        <h2 className="text-base font-bold tracking-tight mb-1">If you&apos;re still looking</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Nearby alternatives — each note is how it differs from this {car.year}{' '}
          {displayModelLabel(car)}.
        </p>

        {cars == null ? (
          <div className="space-y-0 border-t border-zinc-900">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 border-b border-zinc-900 opacity-40" />
            ))}
          </div>
        ) : (
          <ul className="border-t border-zinc-800">
            {cars.map((alt) => {
              const mpgLabel = usesMpge(alt.engine.fuelType) ? 'MPGe' : 'MPG';
              const mpg = formatMpgForCard(alt.fuelEconomy.combined);
              const price = formatPriceShort(alt.price?.msrp, true);
              const inCompare = comparedCars.some((c) => c.id === alt.id);
              return (
                <li key={alt.id} className="border-b border-zinc-900">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-3.5">
                    <Link to={`/car/${alt.id}`} className="min-w-0 flex-1 group">
                      <p className="text-sm font-semibold text-white group-hover:text-zinc-300 tracking-tight">
                        {alt.year} {alt.make} {displayModelLabel(alt)}
                      </p>
                      {edges[alt.id] && (
                        <p className="text-base text-white font-medium mt-1.5 leading-snug">{edges[alt.id]}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1.5">
                        {[
                          mpg !== 'Not on file' ? `${mpg} ${mpgLabel}` : null,
                          price !== 'Not on file' ? `est. ${price}` : null,
                          alt.bodyStyle,
                          alt.driveType,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => addOrReplaceOldestInComparison(alt)}
                      className={`shrink-0 self-start text-[10px] uppercase tracking-wider px-2.5 py-1.5 border ${
                        inCompare
                          ? 'border-white text-white'
                          : 'border-zinc-700 text-zinc-500 hover:border-zinc-400 hover:text-white'
                      }`}
                    >
                      {inCompare ? 'In compare' : '+ Compare'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
