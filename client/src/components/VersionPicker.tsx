import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';
import { differentiateVsAnchor } from '../utils/differentiateCars';
import { formatEngineForDetail } from '../utils/dataValue';
import { efficiencyOf } from '../utils/efficiency';
import { formatCarFuelLabel } from '../utils/fuelDisplay';
import { displayConfigNotes, displayModelLabel, formatTransmissionLabel } from '../utils/trimLabel';

/** "2.0L 4-cyl · CVT · FWD": what tells one version from another. */
function configOf(car: CarSpecs): string {
  const engine = formatEngineForDetail(car.engine);
  return [
    engine !== 'Not on file' ? engine : null,
    car.engine.fuelType !== 'gasoline' ? formatCarFuelLabel(car) : null,
    car.transmission ? formatTransmissionLabel(car.transmission) : null,
    car.driveType,
    ...displayConfigNotes(car),
  ]
    .filter(Boolean)
    .join(' · ');
}

function VersionRow({ car, current, edge }: { car: CarSpecs; current?: boolean; edge?: string }) {
  const efficiency = efficiencyOf(car);
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-zinc-300">
          <span className="font-medium text-white">{displayModelLabel(car)}</span>
          {car.engine.horsepower ? (
            <span className="text-zinc-400 tabular-nums"> · {car.engine.horsepower} hp</span>
          ) : null}
          {current && <span className="text-accent font-medium"> · this one</span>}
        </span>
        {efficiency && (
          <span className="shrink-0 text-xs text-zinc-400 tabular-nums">{efficiency.text}</span>
        )}
      </div>
      <p className="text-xs text-zinc-400 mt-0.5">{configOf(car)}</p>
      {edge && <p className="text-[13px] text-zinc-200 mt-1 leading-snug">{edge}</p>}
    </>
  );
  if (current) {
    return (
      <li aria-current="page" className="px-3 py-2.5 text-sm bg-zinc-950 border-l-2 border-accent">
        {body}
      </li>
    );
  }
  return (
    <li>
      <Link
        to={`/car/${car.id}`}
        className="block px-3 py-2.5 text-sm border-l-2 border-transparent hover:bg-zinc-950 focus-visible:bg-zinc-950"
      >
        {body}
      </Link>
    </li>
  );
}

/**
 * The model year's other versions, by the title: body, engine, gearbox and
 * drive, with how each differs from this one. EPA lists configurations, not
 * trim names. Opens from a search card's "15 versions" link (#versions).
 */
export default function VersionPicker({ car }: { car: CarSpecs }) {
  const { hash } = useLocation();
  const [siblings, setSiblings] = useState<CarSpecs[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let active = true;
    setSiblings(null);
    setOpen(false);
    api
      .getSiblingConfigs(car.id, 48)
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

  // Arriving from a search card's count opens the list.
  useEffect(() => {
    if (hash !== '#versions' || !siblings?.length) return;
    setOpen(true);
    requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'nearest' }));
  }, [hash, siblings]);

  const edges = useMemo(
    () => (siblings?.length ? differentiateVsAnchor(car, siblings) : {}),
    [car, siblings],
  );

  // Grouped by body when the year has more than one: sedans, then coupes.
  const groups = useMemo(() => {
    const out = new Map<string, CarSpecs[]>([[car.bodyStyle, [car]]]);
    for (const sib of siblings ?? []) {
      const group = out.get(sib.bodyStyle);
      if (group) group.push(sib);
      else out.set(sib.bodyStyle, [sib]);
    }
    return [...out];
  }, [car, siblings]);

  if (!siblings?.length) return null;
  const count = siblings.length + 1;

  return (
    <details
      ref={ref}
      id="versions"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="mt-4 scroll-mt-24 group"
    >
      <summary className="inline-flex items-center gap-2 min-h-[44px] px-3 border border-zinc-700 hover:border-zinc-400 text-sm text-zinc-200 hover:text-white cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span>
          <span className="tabular-nums">{count}</span> versions in {car.year}
          <span className="text-zinc-400"> · change version</span>
        </span>
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-2 border border-zinc-800 bg-black max-w-2xl">
        <p className="px-3 pt-2.5 pb-2 text-xs text-zinc-400 leading-relaxed border-b border-zinc-900">
          EPA lists each engine, gearbox and drive, not trim names; each is named by what sets it
          apart.
        </p>
        <div className="max-h-[22rem] overflow-y-auto overscroll-contain">
          {groups.map(([body, cars]) => (
            <div key={body}>
              {groups.length > 1 && (
                <p className="sticky top-0 z-10 bg-black px-3 pt-2.5 pb-1 eyebrow">
                  {bodyStyleLabel(body)}
                </p>
              )}
              <ul className="divide-y divide-zinc-900">
                {cars.map((c) => (
                  <VersionRow key={c.id} car={c} current={c.id === car.id} edge={edges[c.id]} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
