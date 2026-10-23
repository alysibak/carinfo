import { Link, useNavigate, useParams } from 'react-router-dom';
import { Fragment, useEffect, useState } from 'react';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { ModelOverview, ModelYearSummary } from '../types/car.types';
import { Chevron, ErrorState, foldSummaryClass, LoadingScreen } from '../components/ui';
import ToolPageHeader from '../components/ToolPageHeader';
import PageShell, { PageBody } from '../components/PageShell';
import CarPhotoFigure from '../components/CarPhotoFigure';
import { carPhotoSources } from '../utils/carImages';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import {
  generationParts,
  generationSummary,
  modelYearCells,
  modelYearFacts,
  yearSpan,
} from '../utils/modelYearFacts';
import { usePageMeta } from '../utils/pageMeta';
import { complaintPart } from '../utils/recalls';
import { theftSentence } from '@carinfo/shared/theft';

type Status = 'loading' | 'ready' | 'missing' | 'error';

/** "5.9 L/100 km · 202–301 hp", each short figure kept whole when the line wraps. */
function Facts({ facts }: { facts: string[] }) {
  return (
    <>
      {facts.map((fact, i) => (
        <span key={fact}>
          {i > 0 && ' · '}
          {/* A short figure stays whole; a long list ("Gasoline, Hybrid · Sedan,
              Hatchback") may wrap, or it ran past a small phone's edge. */}
          <span className={fact.length <= 24 ? 'whitespace-nowrap' : undefined}>{fact}</span>
        </span>
      ))}
    </>
  );
}

/** Years of one generation together, newest first; years of no known generation on their own. */
function byGeneration(years: ModelYearSummary[]) {
  const groups: Array<{ label?: string; rows: ModelYearSummary[] }> = [];
  for (const row of years) {
    const group = groups.at(-1);
    if (group && group.label === row.generation) group.rows.push(row);
    else groups.push({ label: row.generation, rows: [row] });
  }
  return groups;
}

/**
 * A year's row brought into view: its generation opened if folded, the row
 * lit for a moment so the eye lands on it.
 */
function showYear(year: number) {
  const row = document.getElementById(`year-${year}`);
  if (!row) return;
  const fold = row.closest('details');
  if (fold) fold.open = true;
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  row.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  if (!still && typeof row.animate === 'function') {
    row.animate(
      [{ backgroundColor: 'rgb(52 211 153 / 0.14)' }, { backgroundColor: 'transparent' }],
      {
        duration: 1800,
        easing: 'ease-out',
      },
    );
  }
  row.querySelector('a')?.focus({ preventScroll: true });
}

/**
 * One generation's years, a row each and a column a figure, so a figure reads
 * down the years. Phones keep the five a shopper compares; power, what it was
 * offered as and the version count join on wider screens.
 */
function YearTable({ rows, name }: { rows: ModelYearSummary[]; name: string }) {
  const navigate = useNavigate();
  const th = 'py-2 pr-2 min-[360px]:pr-3 md:pr-4 font-normal';
  const wide = 'hidden md:table-cell';
  return (
    <table className="w-full text-sm tabular-nums border-t border-zinc-800">
      <thead>
        <tr className="text-left text-xs text-zinc-500 align-bottom">
          <th scope="col" className={th}>
            Year
          </th>
          <th scope="col" className={th} aria-label="Best fuel use">
            <span aria-hidden className="md:hidden">
              Fuel use
            </span>
            <span aria-hidden className="hidden md:inline">
              Best fuel use
            </span>
          </th>
          <th scope="col" className={`${th} ${wide}`}>
            Power
          </th>
          <th scope="col" className={th}>
            NHTSA
          </th>
          <th scope="col" className={`${th} text-right`} aria-label="Recalls in Canada">
            <span aria-hidden className="md:hidden">
              Recalls
            </span>
            <span aria-hidden className="hidden md:inline">
              Recalls in Canada
            </span>
          </th>
          <th
            scope="col"
            className={`py-2 md:pr-4 font-normal text-right`}
            aria-label="NHTSA complaints"
          >
            <span aria-hidden className="md:hidden">
              Complaints
            </span>
            <span aria-hidden className="hidden md:inline">
              NHTSA complaints
            </span>
          </th>
          <th scope="col" className={`${th} ${wide}`}>
            Offered as
          </th>
          <th scope="col" className={`py-2 font-normal text-right ${wide}`}>
            Versions
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const cells = modelYearCells(row);
          const td = 'py-3 pr-2 min-[360px]:pr-3 md:pr-4';
          return (
            <Fragment key={row.year}>
              <tr
                id={`year-${row.year}`}
                data-row-link
                // The whole row opens the year, as its hover says; the year is
                // its link for a keyboard or a screen reader.
                onClick={(e) => {
                  if (!(e.target as Element).closest('a')) navigate(`/car/${row.carId}`);
                }}
                className={`scroll-mt-24 cursor-pointer text-zinc-300 hover:bg-zinc-950 ${row.changes ? '' : 'border-b border-zinc-900'}`}
              >
                <th scope="row" className={`${td} text-left font-semibold`}>
                  <Link
                    to={`/car/${row.carId}`}
                    aria-label={`${row.year} ${name}`}
                    className="inline-block py-3 -my-3 pr-3 text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400"
                  >
                    {row.year}
                  </Link>
                </th>
                <td className={`${td} whitespace-nowrap`}>{cells.efficiency}</td>
                <td className={`${td} ${wide}`}>{cells.power}</td>
                <td className={td}>{cells.safety}</td>
                <td className={`${td} text-right`}>{cells.recalls}</td>
                <td className="py-3 md:pr-4 text-right">{cells.complaints}</td>
                <td className={`${td} ${wide} text-zinc-400`}>{cells.offered}</td>
                <td className={`py-3 text-right ${wide}`}>{cells.versions}</td>
              </tr>
              {row.changes && (
                // What changed from the year before, from the EPA records.
                <tr className="border-b border-zinc-900">
                  <td />
                  <td colSpan={7} className="pb-3 text-xs text-zinc-400 leading-relaxed">
                    <Facts facts={row.changes} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * A model across every year on file: "/models/toyota/camry". Search showed
 * a model a configuration at a time; here is the whole line, by generation,
 * each year a row that opens that year's car.
 */
export default function ModelPage() {
  const { make = '', model = '' } = useParams<{ make: string; model: string }>();
  const [overview, setOverview] = useState<ModelOverview | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    api
      .getModelOverview(make, model, { signal: controller.signal })
      .then((found) => {
        setOverview(found);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setStatus(isHttpError(err) && err.status === 404 ? 'missing' : 'error');
      });
    return () => controller.abort();
  }, [make, model, attempt]);

  const name = overview ? `${overview.make} ${overview.name}` : undefined;
  usePageMeta(
    name ? `${name}: every year, ${yearSpan(overview!.first, overview!.last)}` : 'Model',
    name
      ? `Every ${name} from ${overview!.first} to ${overview!.last}, year by year: recalls in Canada, owner complaints, NHTSA crash ratings, fuel use, power and estimated value, by generation.`
      : undefined,
  );

  if (status === 'loading') return <LoadingScreen label="Loading every year" />;
  if (status === 'missing') {
    return (
      <ErrorState
        title="Model not found"
        message="No model by that name is on file. Search finds it by any of its names."
        backTo="/home"
        backLabel="Search"
      />
    );
  }
  if (status === 'error' || !overview) {
    return (
      <ErrorState
        title="Model unavailable"
        message="Could not load this model. Check your connection and try again."
        onRetry={() => setAttempt((n) => n + 1)}
        backTo="/home"
        backLabel="Search"
      />
    );
  }

  const [newest] = overview.years;
  const hasPhoto = carPhotoSources(overview.lead.photo).length > 0;
  const searchHref = `/home?q=${encodeURIComponent(name!)}`;

  // The years to check and the theft record, from the records.
  const records = (
    <>
      {(() => {
        // The years with the most of each, as the records count them: a
        // model's years are compared with each other, not with other models.
        const most = (
          count: (row: ModelYearSummary) => number | undefined,
          about?: (row: ModelYearSummary) => string | undefined,
        ) =>
          overview.years
            .filter((row) => (count(row) ?? 0) > 0)
            .sort((a, b) => (count(b) ?? 0) - (count(a) ?? 0))
            .slice(0, 3)
            .map((row) => {
              const part = about?.(row);
              return {
                year: row.year,
                note: `(${(count(row) ?? 0).toLocaleString('en-CA')}${part ? `, most about ${complaintPart(part).toLowerCase()}` : ''})`,
              };
            });
        // Each year a tap from its row, its generation opened if folded.
        const years = (list: typeof complaints) =>
          list.map(({ year, note }, i) => (
            <Fragment key={year}>
              {i > 0 && ', '}
              <a
                href={`#year-${year}`}
                onClick={(e) => {
                  e.preventDefault();
                  showYear(year);
                }}
                className="text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-300"
              >
                {year}
              </a>{' '}
              {note}
            </Fragment>
          ));
        const complaints = most(
          (row) => row.complaints,
          (row) => row.complaintPart,
        );
        const recalls = most((row) => row.recalls);
        if (!complaints.length && !recalls.length) return null;
        return (
          <section className="mt-6">
            <h2 className="text-base font-bold tracking-tight mb-2">Years to check</h2>
            <ul className="text-sm text-zinc-300 space-y-1 tabular-nums">
              {complaints.length > 0 && (
                <li>Most owner complaints to NHTSA: {years(complaints)}</li>
              )}
              {recalls.length > 0 && <li>Most recalls in Canada: {years(recalls)}</li>}
            </ul>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed max-w-xl">
              Counts from NHTSA’s complaint records and Transport Canada’s recall database, not
              adjusted for how many of each year were sold.
            </p>
          </section>
        );
      })()}

      {overview.theft && (
        <section className="mt-6">
          <h2 className="text-base font-bold tracking-tight mb-2">Theft in Canada</h2>
          <p className="text-sm text-zinc-300">{theftSentence(overview.theft)}</p>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed max-w-xl">
            A count of thefts, so a model with many on the road ranks higher. Ask your insurer
            whether it requires an anti-theft device.{' '}
            <a
              href={overview.theft.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
            >
              Équité’s top {overview.theft.of}
            </a>
          </p>
        </section>
      )}
    </>
  );

  return (
    <PageShell>
      <ToolPageHeader
        backTo="/home"
        backLabel="Search"
        title={name!}
        subtitle={[
          yearSpan(overview.first, overview.last),
          `${overview.years.length} model ${overview.years.length === 1 ? 'year' : 'years'} on file`,
          overview.onSale ? 'on sale' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <PageBody>
        <div
          className={`grid gap-4 sm:gap-6 min-w-0 mb-8 ${
            hasPhoto
              ? 'grid-cols-1 sm:grid-cols-[15rem_1fr] lg:grid-cols-[20rem_1fr] items-start'
              : 'grid-cols-[5.5rem_1fr] sm:grid-cols-[9rem_1fr] items-center'
          }`}
        >
          {hasPhoto ? (
            <CarPhotoFigure car={overview.lead} />
          ) : (
            <div className="h-14 sm:h-20 overflow-hidden">
              <VehiclePlaceholder car={overview.lead} compact hideCaption />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm text-zinc-300">
              Newest on file:{' '}
              <Link
                to={`/car/${newest.carId}`}
                className="text-white font-medium underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400"
              >
                {newest.year} {name}
              </Link>
            </p>
            <p className="text-sm text-zinc-500 mt-1 tabular-nums">
              <Facts facts={modelYearFacts(newest).slice(0, 4)} />
            </p>
            {/* The years to check and the theft record beside the photo, where
                a wide screen left half the width empty. */}
            {hasPhoto && records}
          </div>
        </div>
        {!hasPhoto && <div className="-mt-2 mb-8">{records}</div>}

        {overview.rivals.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold tracking-tight mb-2">Shopped against</h2>
            <ul className="flex flex-wrap gap-2">
              {overview.rivals.map((rival) => (
                <li key={rival.path}>
                  <Link to={rival.path} className="chip inline-flex">
                    {rival.make} {rival.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {byGeneration(overview.years).map((group, index) => {
          const key = `${group.label ?? 'years'}-${group.rows[0].year}`;
          const parts = group.label ? generationParts(group.label) : null;
          const title = (
            <>
              {parts?.name ?? 'Model years'}
              {parts?.years && <span className="font-normal text-zinc-400"> · {parts.years}</span>}
              {parts?.code && (
                <span className="ml-2 text-xs font-normal text-zinc-500">{parts.code}</span>
              )}
            </>
          );
          // The newest generation open; older ones a line each, their years a tap away.
          if (index > 0 && overview.years.length > 6) {
            return (
              <details key={key} className="border-t border-zinc-800 group/gen">
                <summary className={`${foldSummaryClass} gap-4 py-3.5`}>
                  <span className="min-w-0">
                    <h2 className="text-base font-bold tracking-tight">{title}</h2>
                    <span className="block text-[13px] text-zinc-400 mt-0.5 tabular-nums">
                      <Facts facts={generationSummary(group.rows)} />
                    </span>
                  </span>
                  <Chevron className="w-4 h-4 text-zinc-500 group-hover/gen:text-white group-open/gen:rotate-180" />
                </summary>
                <div className="pb-6">
                  <YearTable rows={group.rows} name={name!} />
                </div>
              </details>
            );
          }
          return (
            <section key={key} className="mb-8">
              <h2 className="text-base font-bold tracking-tight mb-2">{title}</h2>
              <YearTable rows={group.rows} name={name!} />
            </section>
          );
        })}

        <p className="text-xs text-zinc-500 leading-relaxed max-w-xl mt-6">
          Each figure is the year’s best or its span across its versions: EPA ratings, NHTSA stars,
          Transport Canada’s recalls and owners’ complaints to NHTSA. A year opens its base version.{' '}
          <Link
            to={searchHref}
            className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
          >
            Search every {name} version
          </Link>
        </p>
      </PageBody>
    </PageShell>
  );
}
