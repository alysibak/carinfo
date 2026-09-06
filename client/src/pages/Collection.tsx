import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { calculateCollectionScore, dedupeByModel } from '../utils/collectionCuration';
import { COLLECTIONS } from '../config/collections';
import {
  formatMpgForCard,
  formatPowerForCard,
  formatPriceShort,
} from '../utils/dataValue';
import { usesMpge } from '../utils/fuelDisplay';
import { displayModelLabel } from '../utils/trimLabel';
import { searchQueryToParams } from '../utils/searchParams';
import { differentiateCars } from '../utils/differentiateCars';
import { ErrorState, LoadingScreen } from '../components/ui';
import ToolPageHeader from '../components/ToolPageHeader';
import PageShell, { PageBody } from '../components/PageShell';
import { usePageMeta } from '../utils/pageMeta';

/**
 * Curated shortlist page — ranked picks + exit to Search.
 * Not an endless card catalog.
 */
export default function Collection() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const collection = collectionId ? COLLECTIONS[collectionId] : null;

  const [cars, setCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalMatching, setTotalMatching] = useState(0);

  usePageMeta(
    collection?.title ?? 'Collection',
    collection?.description ?? 'Curated vehicle shortlist.',
  );

  const rankBy = collection?.display?.rankBy ?? 'best-value';
  const shortlistSize = collection?.display?.shortlistSize ?? 12;
  const scoreFn = useMemo(
    () => (car: CarSpecs) => calculateCollectionScore(car, rankBy),
    [rankBy],
  );

  useEffect(() => {
    if (!collection) return;
    let active = true;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const results = await api.searchCars({
          ...collection.query,
          limit: 200,
          offset: 0,
          collapseByModel: true,
        });
        if (!active) return;
        setTotalMatching(results.total);
        const ranked = dedupeByModel(results.results, scoreFn).sort(
          (a, b) => scoreFn(b) - scoreFn(a),
        );
        setCars(ranked.slice(0, shortlistSize));
      } catch {
        if (!active) return;
        setCars([]);
        setLoadError('Could not load this shortlist.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [collectionId, collection, scoreFn, shortlistSize]);

  if (!collection) {
    return (
      <ErrorState
        title="Collection not found"
        message="That shortlist doesn’t exist."
        backTo="/"
        backLabel="Home"
      />
    );
  }

  if (loading) {
    return <LoadingScreen label="Building shortlist" />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Shortlist unavailable"
        message={loadError}
        backTo="/"
        backLabel="Home"
      />
    );
  }

  const searchHref = `/home?${searchQueryToParams(
    {
      ...collection.query,
      collapseByModel: true,
    },
    1,
  ).toString()}`;

  const moreInSearch = Math.max(0, totalMatching - cars.length);
  const shortlistDiff = useMemo(() => differentiateCars(cars), [cars]);

  return (
    <PageShell>
      <ToolPageHeader
        backTo="/"
        backLabel="Home"
        title={collection.title}
        subtitle={collection.subtitle}
      />

      <PageBody>
        <p className="text-sm text-zinc-400 mb-2 max-w-xl leading-relaxed">
          {collection.description}
        </p>
        <p className="text-xs text-zinc-600 mb-8">
          {cars.length} ranked picks
          {moreInSearch > 0 ? ` · ${moreInSearch.toLocaleString()}+ more in Search` : ''}
          {' · '}
          one trim per model
        </p>

        {shortlistDiff.axes.length > 0 && (
          <div className="mb-6 pb-5 border-b border-zinc-800">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              How the top picks differ
            </p>
            <ul className="space-y-2">
              {shortlistDiff.axes.map((axis) => (
                <li key={axis} className="text-base text-zinc-200 leading-snug">
                  {axis}
                </li>
              ))}
            </ul>
          </div>
        )}

        {cars.length === 0 ? (
          <div className="py-16 border-t border-zinc-900">
            <p className="text-base text-zinc-300 mb-3">Nothing matched this shortlist.</p>
            <Link to={searchHref} className="text-xs text-zinc-400 underline underline-offset-4 hover:text-white">
              Open filters in Search
            </Link>
          </div>
        ) : (
          <>
            <ol className="border-t border-zinc-800">
              {cars.map((car, i) => {
                const mpgLabel = usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG';
                const mpg = formatMpgForCard(car.fuelEconomy.combined);
                const price = formatPriceShort(car.price?.msrp, true);
                return (
                  <li key={car.id} className="border-b border-zinc-900">
                    <Link
                      to={`/car/${car.id}`}
                      className="flex items-start sm:items-center gap-3 sm:gap-4 py-3.5 group"
                    >
                      <span className="w-7 shrink-0 text-xs tabular-nums text-zinc-600 pt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-semibold text-white group-hover:text-zinc-300 tracking-tight truncate">
                          {car.year} {car.make} {displayModelLabel(car)}
                        </p>
                        {shortlistDiff.byCarId[car.id]?.edge && (
                          <p className="text-sm sm:text-base text-zinc-100 font-medium mt-1.5 leading-snug">
                            {shortlistDiff.byCarId[car.id].edge}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 mt-1.5 truncate">
                          {[
                            (() => {
                              const p = formatPowerForCard(car.engine.horsepower);
                              return p === 'Not on file' ? null : p;
                            })(),
                            mpg !== 'Not on file' ? `${mpg} ${mpgLabel}` : null,
                            car.bodyStyle,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {price !== 'Not on file' ? `~${price}` : ''}
                      </span>
                      <span className="shrink-0 text-zinc-600 group-hover:text-white text-sm">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <Link
                to={searchHref}
                className="text-xs uppercase tracking-wider text-white border border-zinc-600 px-4 py-2.5 hover:border-white text-center sm:text-left"
              >
                {moreInSearch > 0
                  ? `Browse all ${totalMatching.toLocaleString()} in Search`
                  : 'Open in Search'}
              </Link>
              <Link to="/?quiz=1" className="text-xs text-zinc-500 hover:text-white">
                Prefer the 3-question finder?
              </Link>
            </div>
          </>
        )}
      </PageBody>
    </PageShell>
  );
}
