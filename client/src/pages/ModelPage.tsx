import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { ModelOverview, ModelYearSummary } from '../types/car.types';
import { ErrorState, LoadingScreen } from '../components/ui';
import ToolPageHeader from '../components/ToolPageHeader';
import PageShell, { PageBody } from '../components/PageShell';
import CarPhotoButton from '../components/CarPhotoButton';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import { modelYearFacts, yearSpan } from '../utils/modelYearFacts';
import { usePageMeta } from '../utils/pageMeta';

type Status = 'loading' | 'ready' | 'missing' | 'error';

/** "Est. value $30k–$31k · 202–301 hp", each figure kept whole when the line wraps. */
function Facts({ facts }: { facts: string[] }) {
  return (
    <>
      {facts.map((fact, i) => (
        <span key={fact}>
          {i > 0 && ' · '}
          <span className="whitespace-nowrap">{fact}</span>
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
      ? `Every ${name} from ${overview!.first} to ${overview!.last}, year by year: estimated value, fuel use, power and NHTSA ratings, by generation.`
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
  const searchHref = `/home?q=${encodeURIComponent(name!)}`;

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
        <div className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[9rem_1fr] gap-4 sm:gap-6 items-center min-w-0 mb-8">
          <div className="h-14 sm:h-20 overflow-hidden">
            <CarPhotoButton car={overview.lead} variant="tile">
              <VehiclePlaceholder car={overview.lead} compact hideCaption />
            </CarPhotoButton>
          </div>
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
            <CarPhotoButton car={overview.lead} className="mt-2 min-h-[40px] text-sm" />
          </div>
        </div>

        {overview.rivals.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs text-zinc-500 mb-2">Shopped against</h2>
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
            <h2 className="text-xs text-zinc-500 mb-2">{group.label ?? 'Model years'}</h2>
            <ol className="border-t border-zinc-800">
              {group.rows.map((row) => (
                <li key={row.year} className="border-b border-zinc-900">
                  <Link
                    to={`/car/${row.carId}`}
                    aria-label={`${row.year} ${name}`}
                    className="flex items-start sm:items-center gap-3 sm:gap-4 py-3.5 group"
                  >
                    <span className="w-12 shrink-0 text-base font-semibold tabular-nums text-white group-hover:text-zinc-300">
                      {row.year}
                    </span>
                    <span className="min-w-0 flex-1 text-xs sm:text-sm text-zinc-400 leading-relaxed tabular-nums">
                      <Facts facts={modelYearFacts(row)} />
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
          </section>
        ))}

        <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
          Each figure is the year’s span or best across its configurations: EPA ratings, NHTSA stars
          and estimated value in CAD. A row opens the year’s base configuration.{' '}
          <Link
            to={searchHref}
            className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
          >
            Search every {name} configuration
          </Link>
        </p>
      </PageBody>
    </PageShell>
  );
}
