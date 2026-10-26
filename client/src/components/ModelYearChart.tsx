import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ModelYearSummary } from '../types/car.types';
import { generationParts } from '../utils/modelYearFacts';
import { complaintPart } from '../utils/recalls';
import { gridStep, labelStep } from '../utils/chartScale';

function yearSentence(row: ModelYearSummary): string {
  const complaints =
    row.complaints != null
      ? `${row.complaints.toLocaleString('en-CA')} owner ${row.complaints === 1 ? 'complaint' : 'complaints'} to NHTSA${
          row.complaintPart && row.complaints > 0
            ? `, most about ${complaintPart(row.complaintPart).toLowerCase()}`
            : ''
        }`
      : 'No complaint count on file';
  const recalls =
    row.recalls != null
      ? `${row.recalls} ${row.recalls === 1 ? 'recall' : 'recalls'} in Canada`
      : 'no recall count on file';
  return `${complaints}; ${recalls}`;
}

/**
 * Every year of a model in two columns of bars sharing one row of years:
 * owners' complaints to NHTSA above, recalls in Canada below, each on its own
 * scale. The table lists the same counts a generation at a time; here a bad
 * run of years shows at a glance. Shaded bands are the generations. A year
 * points or taps to its figures; arrows step through the years.
 */
export default function ModelYearChart({
  years,
  name,
}: {
  /** Newest first, as the model overview lists them. */
  years: ModelYearSummary[];
  /** "Toyota RAV4". */
  name: string;
}) {
  const byYear = useMemo(() => new Map(years.map((row) => [row.year, row])), [years]);
  const first = Math.min(...years.map((row) => row.year));
  const last = Math.max(...years.map((row) => row.year));
  const slots = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const maxComplaints = Math.max(0, ...years.map((row) => row.complaints ?? 0));
  const maxRecalls = Math.max(0, ...years.map((row) => row.recalls ?? 0));
  const worst = years.find((row) => row.complaints === maxComplaints && maxComplaints > 0)?.year;
  const mostRecalled = years.find((row) => row.recalls === maxRecalls && maxRecalls > 0)?.year;

  // Generations alternate a shade, in the order they ran.
  const band = useMemo(() => {
    const shade = new Map<number, boolean>();
    let index = -1;
    let previous: string | undefined;
    for (const row of [...years].sort((a, b) => a.year - b.year)) {
      if (row.generation !== previous || index < 0) index += 1;
      previous = row.generation;
      shade.set(row.year, row.generation ? index % 2 === 0 : false);
    }
    return shade;
  }, [years]);

  const [active, setActive] = useState<number | null>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const onFile = slots.filter((year) => byYear.has(year));
  const focusable = active ?? worst ?? onFile.at(-1);

  const move = (event: KeyboardEvent<HTMLButtonElement>, year: number) => {
    const index = onFile.indexOf(year);
    const to =
      event.key === 'ArrowRight'
        ? onFile[Math.min(onFile.length - 1, index + 1)]
        : event.key === 'ArrowLeft'
          ? onFile[Math.max(0, index - 1)]
          : event.key === 'Home'
            ? onFile[0]
            : event.key === 'End'
              ? onFile.at(-1)
              : undefined;
    if (to == null) return;
    event.preventDefault();
    setActive(to);
    buttons.current.get(to)?.focus();
  };

  // Headroom over the tallest bar for its count.
  const complaintScale = maxComplaints * 1.18;
  const recallScale = maxRecalls * 1.3;
  const complaintGrid = gridStep(maxComplaints);
  const recallGrid = gridStep(maxRecalls);
  const wideStep = labelStep(slots.length, 8);
  const phoneStep = labelStep(slots.length, 5);

  const shown = active != null ? byYear.get(active) : undefined;
  const generation = shown?.generation ? generationParts(shown.generation).name : undefined;

  const COMPLAINTS_H = 'h-28 sm:h-36';
  const GAP_H = 'h-8';
  const RECALLS_H = 'h-12 sm:h-14';
  const tick =
    'absolute right-1.5 sm:right-2 translate-y-1/2 text-[10px] text-zinc-500 tabular-nums';
  const at = (value: number, scale: number) => `${scale ? (value / scale) * 100 : 0}%`;

  return (
    <section className="mb-10" aria-labelledby="years-chart-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
        <h2 id="years-chart-title" className="block-title">
          Complaints and recalls, year by year
        </h2>
        <p className="text-xs text-zinc-500">Point at or tap a year. Shading marks generations.</p>
      </div>
      <p className="ml-9 sm:ml-11 mb-1 text-[11px] text-zinc-400" aria-hidden>
        Owner complaints to NHTSA
      </p>

      <div className="flex">
        {/* One gridline's value for each chart, beside it. */}
        <div className="w-9 sm:w-11 shrink-0" aria-hidden>
          <div className={`relative ${COMPLAINTS_H}`}>
            {complaintGrid > 0 && (
              <span className={tick} style={{ bottom: at(complaintGrid, complaintScale) }}>
                {complaintGrid.toLocaleString('en-CA')}
              </span>
            )}
            <span className={`${tick} bottom-0`}>0</span>
          </div>
          <div className={GAP_H} />
          <div className={`relative ${RECALLS_H}`}>
            {recallGrid > 0 && (
              <span className={tick} style={{ bottom: at(recallGrid, recallScale) }}>
                {recallGrid}
              </span>
            )}
            <span className={`${tick} bottom-0`}>0</span>
          </div>
        </div>

        <div className="relative flex-1 min-w-0">
          {/* Behind the bars: the generations' shading, the gridlines and baselines. */}
          <div className="absolute inset-x-0 top-0 pointer-events-none" aria-hidden>
            <div className="absolute inset-0 flex">
              {slots.map((year) => (
                <div key={year} className={`flex-1 ${band.get(year) ? 'bg-zinc-950' : ''}`} />
              ))}
            </div>
            <div className={`relative ${COMPLAINTS_H} border-b border-zinc-700`}>
              {complaintGrid > 0 && (
                <div
                  className="absolute inset-x-0 border-t border-zinc-800"
                  style={{ bottom: at(complaintGrid, complaintScale) }}
                />
              )}
            </div>
            <div className={GAP_H} />
            <div className={`relative ${RECALLS_H} border-b border-zinc-700`}>
              {recallGrid > 0 && (
                <div
                  className="absolute inset-x-0 border-t border-zinc-800"
                  style={{ bottom: at(recallGrid, recallScale) }}
                />
              )}
            </div>
          </div>

          <div className="relative flex" role="group" aria-label={`${name}, by model year`}>
            {slots.map((year) => {
              const row = byYear.get(year);
              if (!row) {
                // A year not on file: a gap, so the years keep their places.
                return <div key={year} className="flex-1" aria-hidden />;
              }
              const isActive = active === year;
              const complaints = row.complaints ?? 0;
              const recalls = row.recalls ?? 0;
              const bar = `block w-[70%] max-w-6 mx-auto transition-colors duration-100 motion-reduce:transition-none ${
                isActive ? 'bg-white' : 'bg-zinc-500 group-hover:bg-zinc-300'
              }`;
              const count =
                'absolute inset-x-0 text-center text-[10px] font-semibold text-zinc-200 tabular-nums whitespace-nowrap';
              return (
                <button
                  key={year}
                  ref={(node) => {
                    if (node) buttons.current.set(year, node);
                    else buttons.current.delete(year);
                  }}
                  type="button"
                  tabIndex={year === focusable ? 0 : -1}
                  aria-pressed={isActive}
                  aria-label={`${year}: ${yearSentence(row)}`}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setActive(year);
                  }}
                  onFocus={() => setActive(year)}
                  onClick={() => setActive(year)}
                  onKeyDown={(event) => move(event, year)}
                  className={`group flex-1 min-w-0 flex flex-col cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 ${
                    isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <span className={`relative ${COMPLAINTS_H} flex items-end`}>
                    {year === worst && (
                      <span
                        className={count}
                        style={{ bottom: `calc(${at(complaints, complaintScale)} + 3px)` }}
                        aria-hidden
                      >
                        {complaints.toLocaleString('en-CA')}
                      </span>
                    )}
                    <span className={bar} style={{ height: at(complaints, complaintScale) }} />
                  </span>
                  <span className={GAP_H} />
                  <span className={`relative ${RECALLS_H} flex items-end`}>
                    {year === mostRecalled && (
                      <span
                        className={count}
                        style={{ bottom: `calc(${at(recalls, recallScale)} + 3px)` }}
                        aria-hidden
                      >
                        {recalls}
                      </span>
                    )}
                    <span className={bar} style={{ height: at(recalls, recallScale) }} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* The second chart's name, in the gap between the two. */}
          <p
            className={`absolute left-0 pointer-events-none text-[11px] text-zinc-400 top-28 sm:top-36 pt-1.5`}
            aria-hidden
          >
            Recalls in Canada
          </p>

          {/* The years, a few named: round ones, fewer on a phone. */}
          <div className="flex h-6 mt-1" aria-hidden>
            {slots.map((year) => {
              const wide = year % wideStep === 0;
              const phone = year % phoneStep === 0;
              return (
                <div key={year} className="flex-1 min-w-0 relative">
                  {(wide || phone) && (
                    <span
                      className={`absolute left-1/2 -translate-x-1/2 top-1 text-[10px] text-zinc-500 tabular-nums ${
                        phone ? (wide ? '' : 'sm:hidden') : 'hidden sm:block'
                      }`}
                    >
                      {year}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* The year pointed at or tapped, in words, with the way to it. */}
      <div className="mt-3 ml-9 sm:ml-11 min-h-[4.5rem] border-t border-zinc-900 pt-3">
        {shown ? (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <p className="text-sm text-white font-semibold">
                {shown.year}
                {generation && <span className="font-normal text-zinc-500"> · {generation}</span>}
              </p>
              <p className="text-sm text-zinc-300 mt-0.5 tabular-nums">{yearSentence(shown)}</p>
            </div>
            <Link
              to={`/car/${shown.carId}`}
              className="shrink-0 inline-flex items-center min-h-[44px] sm:min-h-0 text-sm text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-300"
            >
              See the {shown.year} {name} →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            {worst != null
              ? `Most complaints: ${worst}. Pick a year for its figures.`
              : 'Pick a year for its figures.'}
          </p>
        )}
      </div>
      <p className="mt-2 ml-9 sm:ml-11 text-xs text-zinc-500 leading-relaxed max-w-2xl">
        Counts from NHTSA’s complaint records and Transport Canada’s recall database, not adjusted
        for how many of each year were sold. Newer years have had less time for owners to report.
      </p>
    </section>
  );
}
