import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { differentiateVsAnchor } from '../utils/differentiateCars';
import { formatMpgForCard } from '../utils/dataValue';
import { usesMpge } from '../utils/fuelDisplay';
import { displayListingSubtitle, displayModelLabel, formatTransmissionLabel } from '../utils/trimLabel';

/** Other EPA configs of the same year/make/model — with how each differs from this one. */
export default function SiblingConfigs({ car }: { car: CarSpecs }) {
  const [siblings, setSiblings] = useState<CarSpecs[] | null>(null);

  useEffect(() => {
    let active = true;
    setSiblings(null);
    api
      .getSiblingConfigs(car.id, 24)
      .then((rows) => {
        if (active) setSiblings(rows.filter((c) => c.id !== car.id));
      })
      .catch(() => {
        if (active) setSiblings([]);
      });
    return () => {
      active = false;
    };
  }, [car.id]);

  const edges = useMemo(
    () => (siblings && siblings.length > 0 ? differentiateVsAnchor(car, siblings) : {}),
    [car, siblings],
  );

  if (siblings == null || siblings.length === 0) return null;

  return (
    <section className="border-b border-zinc-900">
      <div className="page-wrap-wide py-5">
        <h2 className="text-base font-bold tracking-tight mb-1">Other configurations</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Same year and model — notes say how each trim differs from this one.
        </p>
        <ul className="flex flex-col border border-zinc-900 divide-y divide-zinc-900 max-h-72 overflow-y-auto">
          {siblings.map((sib) => {
            const subtitle = displayListingSubtitle(sib);
            const trans = sib.transmission ? formatTransmissionLabel(sib.transmission) : null;
            const mpgLabel = usesMpge(sib.engine.fuelType) ? 'MPGe' : 'MPG';
            const mpg = formatMpgForCard(sib.fuelEconomy.combined);
            return (
              <li key={sib.id}>
                <Link
                  to={`/car/${sib.id}`}
                  className="block px-3 py-2.5 text-sm hover:bg-zinc-950"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-zinc-200">
                      {displayModelLabel(sib)}
                      {subtitle ? <span className="text-zinc-500"> · {subtitle}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                      {[
                        trans,
                        sib.driveType,
                        mpg !== 'Not on file' ? `${mpg} ${mpgLabel}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  {edges[sib.id] && (
                    <p className="text-sm text-zinc-100 font-medium mt-1.5 leading-snug">{edges[sib.id]}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
