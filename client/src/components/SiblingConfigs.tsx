import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { differentiateVsAnchor } from '../utils/differentiateCars';
import { formatEngineForDetail } from '../utils/dataValue';
import { efficiencyOf } from '../utils/efficiency';
import { formatCarFuelLabel } from '../utils/fuelDisplay';
import { displayConfigNotes, displayModelLabel, formatTransmissionLabel } from '../utils/trimLabel';

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
          The same year and model with another engine, gearbox or drive. EPA lists configurations,
          not trim names, so each is named by what sets it apart.
        </p>
        <ul className="flex flex-col border border-zinc-900 divide-y divide-zinc-900 max-h-72 overflow-y-auto">
          {siblings.map((sib) => {
            // "Civic · CVT" named none of what tells siblings apart: the engine
            // (1.5L turbo or 2.0L), a hybrid, the drive, and the wheel sizes EPA
            // keeps in the name.
            const engine = formatEngineForDetail(sib.engine);
            const fuel = sib.engine.fuelType !== 'gasoline' ? formatCarFuelLabel(sib) : null;
            const config = [
              engine !== 'Not on file' ? engine : null,
              fuel,
              sib.transmission ? formatTransmissionLabel(sib.transmission) : null,
              sib.driveType,
              ...displayConfigNotes(sib),
            ]
              .filter(Boolean)
              .join(' · ');
            const efficiency = efficiencyOf(sib);
            return (
              <li key={sib.id}>
                <Link to={`/car/${sib.id}`} className="block px-3 py-2.5 text-sm hover:bg-zinc-950">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-zinc-200">
                      <span className="font-medium text-white">{displayModelLabel(sib)}</span>
                      {config ? <span className="text-zinc-400"> · {config}</span> : null}
                    </span>
                    {efficiency && (
                      <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
                        {efficiency.text}
                      </span>
                    )}
                  </div>
                  {edges[sib.id] && (
                    <p className="text-sm text-zinc-100 font-medium mt-1.5 leading-snug">
                      {edges[sib.id]}
                    </p>
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
