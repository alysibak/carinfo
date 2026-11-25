import { Link, useParams, useSearchParams } from 'react-router-dom';
import { makePath } from '@carinfo/shared/make-path';
import { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { ModelYearOverview } from '../types/car.types';
import { ErrorState } from '../components/ui';
import ModelPageSkeleton from '../components/ModelPageSkeleton';
import PageShell, { PageBody } from '../components/PageShell';
import CarCard from '../components/CarCard';
import { modelYearFacts } from '../utils/modelYearFacts';
import { usePageMeta } from '../utils/pageMeta';
import { differentiateCars } from '../utils/differentiateCars';
import { modelYearKey, takePrefetched } from '../utils/prefetch';
import { t, tp } from '../i18n';
import Breadcrumbs from '../components/Breadcrumbs';
import VersionChooser from '../components/VersionChooser';
import { CHOICE_IDS, matchVersions, type Picks } from '../utils/versionChoice';

type Status = 'loading' | 'ready' | 'missing' | 'error';

/**
 * One model year of a family with several configurations: "/models/honda/civic/2024".
 * Years with a single configuration stay on the car dossier.
 */
export default function ModelYearPage() {
  const {
    make = '',
    model = '',
    year: yearParam = '',
  } = useParams<{
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
    (
      takePrefetched<ModelYearOverview>(modelYearKey(make, model, year)) ??
      api.getModelYearOverview(make, model, year, { signal: controller.signal })
    )
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

  const diff = useMemo(() => (overview ? differentiateCars(overview.cars) : null), [overview]);

  // The versions picked down to, kept in the address so Back and a shared link keep them.
  const [params, setParams] = useSearchParams();
  const picks = useMemo<Picks>(
    () =>
      Object.fromEntries(
        CHOICE_IDS.flatMap((id) => (params.get(id) ? [[id, params.get(id)!]] : [])),
      ),
    [params],
  );
  const shown = useMemo(
    () => (overview ? matchVersions(overview.cars, picks) : []),
    [overview, picks],
  );
  const pick = (next: Picks) => {
    const out = new URLSearchParams();
    for (const id of CHOICE_IDS) if (next[id]) out.set(id, next[id]!);
    setParams(out, { replace: true });
  };

  const name = overview ? `${overview.year} ${overview.make} ${overview.name}` : t('Model year');
  usePageMeta(
    name,
    overview
      ? t(
          '{count} configurations of the {year} {make} {model}: fuel use, power, crash ratings and estimated value side by side.',
          {
            count: overview.summary.configurations,
            year: overview.year,
            make: overview.make,
            model: overview.name,
          },
        )
      : undefined,
  );

  if (status === 'loading') return <ModelPageSkeleton />;
  if (status === 'missing') {
    return (
      <ErrorState
        title={t('Model year not found')}
        message={t(
          'No page for that year of this model. It may have only one configuration on file, or go by another name.',
        )}
        backTo={`/models/${encodeURIComponent(make)}/${encodeURIComponent(model)}`}
        backLabel={t('Back to the model')}
      />
    );
  }
  if (status === 'error' || !overview) {
    return (
      <ErrorState
        title={t('Model year unavailable')}
        message={t('Could not load this model year. Check your connection and try again.')}
        onRetry={() => setAttempt((n) => n + 1)}
        backTo="/home"
        backLabel={t('Search cars')}
      />
    );
  }

  const facts = modelYearFacts(overview.summary, { versions: false });

  return (
    <PageShell>
      <PageBody>
        <Breadcrumbs
          items={[
            { label: overview.make, to: makePath(overview.make) },
            { label: overview.name, to: overview.modelPath },
            { label: String(overview.year) },
          ]}
        />
        <h1 className="page-title mt-4 mb-2">{name}</h1>
        <p className="text-sm text-zinc-400 mb-6 max-w-2xl leading-relaxed">
          {tp(
            overview.summary.configurations,
            '{count} version on file',
            '{count} versions on file',
          )}
          {facts.length ? ` · ${facts.join(' · ')}` : ''}.
        </p>

        {diff && diff.axes.length > 0 && (
          <div className="mb-6 pb-5 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2">{t('How the versions differ')}</p>
            <ul className="space-y-2">
              {diff.axes.map((axis) => (
                <li key={axis} className="text-base text-zinc-200 leading-snug">
                  {axis}
                </li>
              ))}
            </ul>
          </div>
        )}

        {overview.cars.length >= 4 && (
          <section aria-labelledby="choose-version" className="mb-6 pb-6 border-b border-zinc-800">
            <h2 id="choose-version" className="text-base font-semibold text-white mb-3">
              {t('Find your version')}
            </h2>
            <VersionChooser
              cars={overview.cars}
              picks={picks}
              onChange={pick}
              shown={shown.length}
            />
          </section>
        )}

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shown.map((car) => (
            <li key={car.id}>
              <CarCard
                car={car}
                notes={
                  diff?.byCarId[car.id]?.edge ? (
                    <p className="text-sm text-zinc-200 leading-snug">
                      {diff.byCarId[car.id].edge}
                    </p>
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
            {t('Every year of the {make} {model}', {
              make: overview.make,
              model: overview.name,
            })}
          </Link>
        </p>
      </PageBody>
    </PageShell>
  );
}
