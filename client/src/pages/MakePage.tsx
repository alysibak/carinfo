import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { BodyStyle, MakeModel, MakeOverview } from '../types/car.types';
import Breadcrumbs from '../components/Breadcrumbs';
import { ErrorState } from '../components/ui';
import { LoadingScreen } from '../components/LoadingScreen';
import { carPhotoSources } from '../utils/carImages';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';
import { FUEL_TYPES } from '../config/browseTaxonomy';
import { usePageMeta, useNoIndex } from '../utils/pageMeta';
import { intlLocale, msg, t, tp } from '../i18n';

/** What a shopper narrows a make's models by: its shape, or a battery. */
const GROUPS: Array<{ id: string; label: string; bodies?: BodyStyle[]; electrified?: true }> = [
  { id: 'suv', label: msg('SUVs'), bodies: ['suv'] },
  {
    id: 'car',
    label: msg('Cars'),
    bodies: ['sedan', 'hatchback', 'wagon', 'coupe', 'convertible'],
  },
  { id: 'truck', label: msg('Pickups'), bodies: ['truck'] },
  { id: 'van', label: msg('Vans'), bodies: ['minivan', 'van'] },
  { id: 'electrified', label: msg('Hybrid or electric'), electrified: true },
];

const ELECTRIFIED = new Set(['hybrid', 'plug-in hybrid', 'electric']);

function inGroup(model: MakeModel, group: (typeof GROUPS)[number]): boolean {
  if (group.electrified) return model.fuelTypes.some((fuel) => ELECTRIFIED.has(fuel));
  return model.bodyStyles.some((body) => group.bodies!.includes(body));
}

const span = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);

/** "from 5.5 L/100 km" or "up to 515 km range", as the newest year reads. */
function figure(model: MakeModel): string | null {
  if (model.combinedMpg) {
    return t('from {value} L/100 km', { value: (235.215 / model.combinedMpg).toFixed(1) });
  }
  if (model.rangeMiles) {
    return t('up to {km} km range', {
      km: Math.round(model.rangeMiles * 1.609344).toLocaleString(intlLocale()),
    });
  }
  return null;
}

function kinds(model: MakeModel): string {
  const fuels = model.fuelTypes
    .filter((fuel) => fuel !== 'gasoline')
    .map((fuel) => t(FUEL_TYPES.find((type) => type.id === fuel)?.label ?? fuel));
  return [...model.bodyStyles.map((body) => t(bodyStyleLabel(body))), ...fuels].join(' · ');
}

function ModelCard({ make, model }: { make: string; model: MakeModel }) {
  const photo = carPhotoSources(model.photo);
  return (
    <li>
      <Link
        to={model.path}
        className="group flex h-full flex-col border border-zinc-800 bg-zinc-950 hover:border-zinc-600 focus-visible:border-zinc-400 overflow-hidden"
      >
        {/* Every card keeps the photo's place, so a row lines up with or without one. */}
        <span className="relative block aspect-[16/10] bg-zinc-900 overflow-hidden">
          {photo.length > 0 && (
            <img
              src={photo.at(-1)}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          )}
        </span>
        <span className="flex flex-1 flex-col p-3.5">
          <span className="text-[15px] font-semibold text-white leading-snug">
            {make} {model.name}
          </span>
          <span className="text-xs text-zinc-400 tabular-nums mt-0.5">
            {span(model.first, model.last)}
          </span>
          <span className="text-xs text-zinc-400 mt-1.5">{kinds(model)}</span>
          {figure(model) && (
            <span className="text-[13px] text-zinc-200 tabular-nums mt-1">{figure(model)}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

function NotFound() {
  useNoIndex();
  return (
    <ErrorState
      title={t('Make not found')}
      message={t('No make by that name is on file.')}
      backTo="/makes"
      backLabel={t('Every make')}
    />
  );
}

/**
 * A make's models, the ones on sale first and best known first, each a way
 * into its page; then the earlier models, a line each. Quick filters narrow
 * a long list (Toyota has 40) to a shape, or to hybrids and electrics.
 */
export default function MakePage() {
  const { make = '' } = useParams<{ make: string }>();
  const [overview, setOverview] = useState<MakeOverview | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [group, setGroup] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setGroup(null);
    api
      .getMakeOverview(make)
      .then((found) => {
        if (!active) return;
        setOverview(found);
        setStatus('ready');
      })
      .catch((err) => {
        if (active) setStatus(isHttpError(err) && err.status === 404 ? 'missing' : 'error');
      });
    return () => {
      active = false;
    };
  }, [make]);

  const name = overview?.make ?? '';
  const onSaleCount = overview?.models.filter((model) => model.onSale).length ?? 0;
  usePageMeta(
    overview ? t('{make}: every model on file', { make: name }) : undefined,
    overview
      ? t(
          '{count} {make} models from {first} to {last}: fuel use, crash ratings and recalls in Canada, year by year.',
          { count: overview.models.length, make: name, first: overview.first, last: overview.last },
        )
      : undefined,
  );

  const groups = useMemo(
    () => GROUPS.filter((g) => overview?.models.some((model) => inGroup(model, g))),
    [overview],
  );
  const shown = useMemo(() => {
    const chosen = GROUPS.find((g) => g.id === group);
    return (overview?.models ?? []).filter((model) => !chosen || inGroup(model, chosen));
  }, [overview, group]);

  if (status === 'loading') return <LoadingScreen label={t('Loading')} />;
  if (status === 'missing') return <NotFound />;
  if (status === 'error' || !overview) {
    return (
      <ErrorState
        title={t('Make unavailable')}
        message={t('Could not load this make. Check your connection and try again.')}
        backTo="/makes"
        backLabel={t('Every make')}
      />
    );
  }

  const current = shown.filter((model) => model.onSale);
  const past = shown.filter((model) => !model.onSale);

  return (
    <div className="bg-black text-white pb-12">
      <div className="page-wrap pt-6 sm:pt-8">
        <Breadcrumbs
          className="mb-2"
          items={[{ label: t('Makes'), to: '/makes' }, { label: overview.make }]}
        />
        <h1 className="page-title">{overview.make}</h1>
        <p className="mt-2 text-sm text-zinc-400 tabular-nums">
          {[
            tp(overview.models.length, '{count} model on file', '{count} models on file'),
            span(overview.first, overview.last),
            onSaleCount ? t('{count} on sale', { count: onSaleCount }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {groups.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t('Show')}>
            <button
              type="button"
              aria-pressed={group === null}
              onClick={() => setGroup(null)}
              className={`chip ${group === null ? 'chip-on' : ''}`}
            >
              {t('All')}
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={group === g.id}
                onClick={() => setGroup(group === g.id ? null : g.id)}
                className={`chip ${group === g.id ? 'chip-on' : ''}`}
              >
                {t(g.label)}
              </button>
            ))}
          </div>
        )}

        {current.length > 0 && (
          <section className="mt-8" aria-labelledby="make-on-sale">
            <h2 id="make-on-sale" className="section-title mb-4">
              {t('On sale')}
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {current.map((model) => (
                <ModelCard key={model.path} make={overview.make} model={model} />
              ))}
            </ul>
          </section>
        )}

        {past.length > 0 && (
          <section className="mt-10" aria-labelledby="make-earlier">
            <h2 id="make-earlier" className="section-title mb-4">
              {t('Earlier models')}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 border-t border-zinc-900">
              {past.map((model) => (
                <li key={model.path} className="border-b border-zinc-900">
                  <Link
                    to={model.path}
                    className="flex items-baseline justify-between gap-3 py-3 min-h-[44px] text-[15px] text-zinc-200 hover:text-white"
                  >
                    <span>
                      {overview.make} {model.name}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                      {span(model.first, model.last)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-sm">
          <Link
            to={`/home?make=${encodeURIComponent(overview.make)}`}
            className="text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:text-white"
          >
            {t('Search every {make} version, with filters', { make: overview.make })}
          </Link>
        </p>
      </div>
    </div>
  );
}
