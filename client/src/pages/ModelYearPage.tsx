import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { ModelYearOverview } from '../types/car.types';
import { BackLink, ErrorState } from '../components/ui';
import ModelPageSkeleton from '../components/ModelPageSkeleton';
import PageShell, { PageBody } from '../components/PageShell';
import CarCard from '../components/CarCard';
import { modelYearFacts } from '../utils/modelYearFacts';
import { usePageMeta } from '../utils/pageMeta';
import { differentiateCars } from '../utils/differentiateCars';

type Status = 'loading' | 'ready' | 'missing' | 'error';

/**
 * One model year of a family with several configurations: "/models/honda/civic/2024".
 * Years with a single configuration stay on the car dossier.
 */
export default function ModelYearPage() {
  const { make = '', model = '', year: yearParam = '' } = useParams<{
    make: string;
    model: string;
    year: string;
  }>();
  const year = parseInt(yearParam, 10);
  const [overview, setOverview] = useState<ModelYearOverview | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    if (!Number.isFinite(year)) {
      setStatus('missing');
      return;
    }
    api
      .getModelYearOverview(make, model, year, { signal: controller.signal })
      .then((found) => {
        if (controller.signal.aborted) return;
        setOverview(found);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setStatus(isHttpError(err) && err.status === 404 ? 'missing' : 'error');
      });
    return () => controller.abort();
  }, [make, model, year, attempt]);

  const diff = useMemo(
    () => (overview ? differentiateCars(overview.cars) : null),
    [overview],
  );

  const name = overview ? `${overview.year} ${overview.make} ${overview.name}` : 'Model year';
  usePageMeta(
    name,
    overview
      ? `${overview.summary.configurations} configurations of the ${overview.year} ${overview.make} ${overview.name}: fuel use, power, crash ratings and estimated value side by side.`
      : undefined,
  );

  if (status === 'loading') return <ModelPageSkeleton />;
  if (status === 'missing') {
    return (
      <ErrorState
        title="Model year not found"
        message="No page for that year of this model. It may have only one configuration on file, or go by another name."
        backTo={`/models/${encodeURIComponent(make)}/${encodeURIComponent(model)}`}
        backLabel="Back to the model"
      />
    );
  }
  if (status === 'error' || !overview) {
    return (
      <ErrorState
        title="Model year unavailable"
        message="Could not load this model year. Check your connection and try again."
        onRetry={() => setAttempt((n) => n + 1)}
        backTo="/home"
        backLabel="Search cars"
      />
    );
  }

  const facts = modelYearFacts(overview.summary);

  return (
    <PageShell>
      <PageBody>
        <BackLink to={overview.modelPath} label={`${overview.make} ${overview.name}`} />
        <h1 className="page-title mt-4 mb-2">{name}</h1>
        <p className="text-sm text-zinc-400 mb-6 max-w-2xl leading-relaxed">
          {overview.summary.configurations} configurations on file
          {facts.length ? ` · ${facts.join(' · ')}` : ''}.
        </p>

        {diff && diff.axes.length > 0 && (
          <div className="mb-6 pb-5 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2">How the versions differ</p>
            <ul className="space-y-2">
              {diff.axes.map((axis) => (
                <li key={axis} className="text-base text-zinc-200 leading-snug">
                  {axis}
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {overview.cars.map((car) => (
            <li key={car.id}>
              <CarCard
                car={car}
                notes={
                  diff?.byCarId[car.id]?.edge ? (
                    <p className="text-sm text-zinc-200 leading-snug">{diff.byCarId[car.id].edge}</p>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-zinc-500">
          <Link
            to={overview.modelPath}
            className="underline underline-offset-4 decoration-zinc-700 hover:text-white hover:decoration-zinc-400"
          >
            Every year of the {overview.make} {overview.name}
          </Link>
        </p>
      </PageBody>
    </PageShell>
  );
}
