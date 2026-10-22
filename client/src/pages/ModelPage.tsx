import { Link, useParams } from 'react-router-dom';
import { Fragment, useEffect, useState } from 'react';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { ModelOverview, ModelYearSummary } from '../types/car.types';
import { ErrorState, LoadingScreen } from '../components/ui';
import ToolPageHeader from '../components/ToolPageHeader';
import PageShell, { PageBody } from '../components/PageShell';
import CarPhotoFigure from '../components/CarPhotoFigure';
import { carPhotoSources } from '../utils/carImages';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import { modelYearCells, modelYearFacts, modelYearLines, yearSpan } from '../utils/modelYearFacts';
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
              return `${row.year} (${(count(row) ?? 0).toLocaleString('en-CA')}${part ? `, most about ${complaintPart(part).toLowerCase()}` : ''})`;
            });
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
                <li>Most owner complaints to NHTSA: {complaints.join(', ')}</li>
              )}
              {recalls.length > 0 && <li>Most recalls in Canada: {recalls.join(', ')}</li>}
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

        {byGeneration(overview.years).map((group) => (
          <section key={`${group.label ?? 'years'}-${group.rows[0].year}`} className="mb-8">
            <h2 className="text-base font-bold tracking-tight mb-2">
              {group.label ?? 'Model years'}
            </h2>
            {/* Phones: a row of figures per year. */}
            <ol className="md:hidden border-t border-zinc-800">
              {group.rows.map((row) => (
                <li key={row.year} className="border-b border-zinc-900">
                  <Link
                    to={`/car/${row.carId}`}
                    aria-label={`${row.year} ${name}`}
                    className="flex items-start gap-3 py-3.5 group"
                  >
                    <span className="w-12 shrink-0 text-base font-semibold tabular-nums text-white group-hover:text-zinc-300">
                      {row.year}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-relaxed tabular-nums">
                      {(() => {
                        // The car, its records, what it was offered as: a line
                        // each, not eight facts in one run.
                        const lines = modelYearLines(row);
                        return (
                          <>
                            {lines.car.length > 0 && (
                              <span className="block text-zinc-100">
                                <Facts facts={lines.car} />
                              </span>
                            )}
                            {lines.records.length > 0 && (
                              <span className="block text-zinc-300">
                                <Facts facts={lines.records} />
                              </span>
                            )}
                            <span className="block text-[13px] text-zinc-500">
                              <Facts facts={lines.offered} />
                            </span>
                          </>
                        );
                      })()}
                      {row.changes && (
                        // What changed from the year before, from the EPA records.
                        <span className="block mt-1 text-accent">
                          <Facts facts={row.changes} />
                        </span>
                      )}
                    </span>
                    <span
                      className="shrink-0 text-zinc-600 group-hover:text-white text-sm"
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            {/* Wider screens: a table, so a column reads down the years. */}
            <table className="hidden md:table w-full text-sm tabular-nums border-t border-zinc-800">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Year
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Best fuel use
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Power
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    NHTSA
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal text-right">
                    Recalls in Canada
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal text-right">
                    NHTSA complaints
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Offered as
                  </th>
                  <th scope="col" className="py-2 font-normal text-right">
                    Versions
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => {
                  const cells = modelYearCells(row);
                  return (
                    <Fragment key={row.year}>
                      <tr
                        className={`text-zinc-300 hover:bg-zinc-950 ${row.changes ? '' : 'border-b border-zinc-900'}`}
                      >
                        <th scope="row" className="py-3 pr-4 text-left font-semibold">
                          <Link
                            to={`/car/${row.carId}`}
                            className="inline-block py-2 -my-2 pr-4 text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400"
                          >
                            {row.year}
                          </Link>
                        </th>
                        <td className="py-3 pr-4">{cells.efficiency}</td>
                        <td className="py-3 pr-4">{cells.power}</td>
                        <td className="py-3 pr-4">{cells.safety}</td>
                        <td className="py-3 pr-4 text-right">{cells.recalls}</td>
                        <td className="py-3 pr-4 text-right">{cells.complaints}</td>
                        <td className="py-3 pr-4 text-zinc-400">{cells.offered}</td>
                        <td className="py-3 text-right">{cells.versions}</td>
                      </tr>
                      {row.changes && (
                        <tr className="border-b border-zinc-900">
                          <td />
                          <td colSpan={7} className="pb-3 -mt-1 text-xs text-accent">
                            <Facts facts={row.changes} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}

        <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
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
